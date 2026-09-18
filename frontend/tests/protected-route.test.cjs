const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { test } = require('node:test');
const ts = require('typescript');

// Compile the real component, not a duplicate implementation of its guard.
// Only hook inputs are stubbed; React's JSX runtime creates the real elements.
const sourcePath = path.resolve(__dirname, '../components/auth/ProtectedRoute.tsx');
const compiled = ts.transpileModule(fs.readFileSync(sourcePath, 'utf8'), {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    jsx: ts.JsxEmit.ReactJSX,
    target: ts.ScriptTarget.ES2020,
  },
}).outputText;

function renderGuard(state, allowedRoles = ['authority']) {
  const exports = {};
  const location = { pathname: '/authority' };
  const Navigate = () => null;
  vm.runInNewContext(compiled, {
    exports,
    require(name) {
      if (name === '../../store/useAuthStore') {
        return { useAuthStore: (select) => select(state) };
      }
      if (name === 'react-router-dom') {
        return { Navigate, useLocation: () => location };
      }
      return require(name);
    },
  }, { filename: sourcePath });
  return {
    element: exports.ProtectedRoute({ children: 'protected-content', allowedRoles }),
    Navigate,
    location,
  };
}

const authority = { id: 'test-authority', role: 'authority' };

test('logged-in user without a token redirects to login, preserving destination', () => {
  const { element, Navigate, location } = renderGuard({
    isLoggedIn: true, user: authority, token: null,
  });
  assert.equal(element.type, Navigate);
  assert.equal(element.props.to, '/login');
  assert.equal(element.props.replace, true);
  assert.equal(element.props.state.from, location);
});

test('complete session with the required role renders protected content', () => {
  const { element, Navigate } = renderGuard({
    isLoggedIn: true, user: authority, token: 'test-session',
  });
  assert.notEqual(element.type, Navigate);
  assert.equal(element.props.children, 'protected-content');
});

test('complete session with the wrong role redirects to unauthorized', () => {
  const { element, Navigate } = renderGuard({
    isLoggedIn: true, user: { id: 'test-citizen', role: 'citizen' }, token: 'test-session',
  });
  assert.equal(element.type, Navigate);
  assert.equal(element.props.to, '/unauthorized');
});
