const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');

const root = path.resolve(__dirname, '..');

for (const page of ['book/index.html', 'book.html']) {
  for (const flow of ['individual', 'org']) {
    test(`${page}: ${flow} questionnaire answers reach the email`, async () => {
      const html = fs.readFileSync(path.join(root, page), 'utf8');
      const markup = html.match(/<form id="inquiry-form"[\s\S]*?<\/form>/)[0];
      const fields = [...markup.matchAll(/<input\b([^>]+)>/g)].map(([, attrs]) => {
        const get = key => (attrs.match(new RegExp('\\b' + key + '="([^"]*)"')) || [])[1] || '';
        return { id: get('id'), name: get('name'), type: get('type'), value: get('value') };
      });
      const byId = Object.fromEntries(fields.map(field => [field.id, field]));
      const values = {
        's10-name': 'Test Person', 's10-email': 'test@example.com', 's10-phone': '555-0100',
        's8-date': 'January 18, 2027', 's8-time': '7:00 PM', 's8-location': 'Test Arena',
      };
      for (const [id, value] of Object.entries(values)) {
        byId[id] = Object.assign(byId[id] || {}, { value });
      }
      const stub = { classList: { add() {}, remove() {} }, style: {}, offsetTop: 0 };
      const form = { querySelector: () => null, querySelectorAll: () => fields };
      let request;
      const context = {
        document: {
          addEventListener() {}, getElementById: id => byId[id] || stub,
          querySelector: () => stub,
          querySelectorAll: selector => selector.includes('check-card.selected')
            ? ['recruiting-highlight', 'social-clips'].map(value => ({ getAttribute: () => value })) : [],
        },
        window: { addEventListener() {}, scrollTo() {} },
        setTimeout: fn => fn(), alert: message => assert.fail(message),
        fetch: async (url, options) => {
          assert.equal(url, '/api/send-form');
          request = JSON.parse(options.body);
          return { ok: true };
        },
      };
      vm.createContext(context);
      vm.runInContext(fs.readFileSync(path.join(root, 'main.js'), 'utf8'), context);
      vm.runInContext([...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n'), context);
      const pick = (handler, value) => context.window[handler]({
        classList: { add() {} }, getAttribute: () => value,
      });
      pick('pickS1', flow);
      if (flow === 'org') {
        pick('pickS3', 'affiliate');
      } else {
        pick('pickS2', 'recruiting');
        pick('pickS4', 'full-service');
        pick('pickS5', '5-7');
        context.window.advanceFrom6();
        pick('pickS7', 'yes');
        context.window.advanceFrom8();
        pick('pickS9', 'parent');
      }
      await context.window.submitInquiry({ preventDefault() {}, currentTarget: form });
      const expected = flow === 'org' ? { coverage_type: 'org', main_reason: 'affiliate' } : {
        coverage_type: 'individual', main_reason: 'recruiting', service_type: 'full-service',
        games_count: '5-7', deliverables: 'recruiting-highlight, social-clips', has_first_game: 'yes',
        game_date: values['s8-date'], game_time: values['s8-time'], game_location: values['s8-location'],
        who_filling_out: 'parent',
      };
      assert.equal(request.formType, 'inquiry');
      assert.equal(request.fields.email, 'test@example.com');
      assert.ok(!('form-name' in request.fields));
      for (const [key, value] of Object.entries(expected)) assert.equal(request.fields[key], value, key);

      // Exercise the real email handler with a fake transport; never send an email.
      let email;
      const apiContext = {
        module: { exports: {} }, process: { env: { RESEND_API_KEY: 'mock', RESEND_FROM_EMAIL: 'mock@example.com' } },
        fetch: async (url, options) => {
          assert.equal(url, 'https://api.resend.com/emails');
          email = JSON.parse(options.body);
          return { ok: true, text: async () => '{"id":"mock"}' };
        },
      };
      vm.createContext(apiContext);
      vm.runInContext(fs.readFileSync(path.join(root, 'api/send-form.js'), 'utf8'), apiContext);
      await apiContext.module.exports({ method: 'POST', body: request }, {
        status(code) { assert.equal(code, 200); return this; },
        json(body) { assert.equal(body.ok, true); },
      });
      assert.equal(email.reply_to, 'test@example.com');
      for (const value of Object.values(expected)) assert.ok(email.html.includes(value), value);
    });
  }
}
