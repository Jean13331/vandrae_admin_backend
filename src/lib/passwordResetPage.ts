function page(title: string, body: string) {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <style>
      body { margin: 0; background: #f4efe4; font-family: Arial, sans-serif; color: #1a3c34; }
      .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 24px 16px; }
      .card { width: 100%; max-width: 420px; background: #fff; border-radius: 18px; padding: 24px; box-shadow: 0 8px 24px rgba(26,46,40,.08); }
      .kicker { margin: 0 0 6px; font-size: 12px; letter-spacing: .12em; text-transform: uppercase; color: #2d6a4f; font-weight: 700; }
      h1 { margin: 0 0 8px; font-size: 22px; }
      p { margin: 0 0 16px; line-height: 1.5; color: #3d4f48; }
      label { display: block; margin: 12px 0 6px; font-size: 13px; font-weight: 700; }
      input { width: 100%; box-sizing: border-box; padding: 12px 14px; border: 1px solid #d7e0dc; border-radius: 12px; font-size: 16px; }
      button { margin-top: 18px; width: 100%; border: 0; border-radius: 12px; padding: 14px; background: #2d6a4f; color: #fff; font-size: 16px; font-weight: 700; cursor: pointer; }
      .error { margin: 0 0 12px; color: #b42318; font-size: 14px; }
    </style>
  </head>
  <body>
    <div class="wrap"><div class="card">${body}</div></div>
  </body>
</html>`
}

export function passwordResetFormHtml(input: { token: string; error?: string }) {
  const error = input.error
    ? `<p class="error">${escapeHtml(input.error)}</p>`
    : ''
  return page(
    'Nova senha — Vandrae',
    `<p class="kicker">Vandrae</p>
     <h1>Criar senha nova</h1>
     <p>Escolha uma senha com pelo menos 6 caracteres.</p>
     ${error}
     <form method="post" action="/auth/reset-password">
       <input type="hidden" name="token" value="${escapeHtml(input.token)}" />
       <label for="password">Nova senha</label>
       <input id="password" name="password" type="password" minlength="6" required autocomplete="new-password" />
       <label for="confirm">Confirmar senha</label>
       <input id="confirm" name="confirm" type="password" minlength="6" required autocomplete="new-password" />
       <button type="submit">Salvar senha</button>
     </form>
     <script>
       document.querySelector('form').addEventListener('submit', function (event) {
         var password = document.getElementById('password').value;
         var confirm = document.getElementById('confirm').value;
         if (password !== confirm) {
           event.preventDefault();
           alert('As senhas não coincidem.');
         }
       });
     </script>`,
  )
}

export function passwordResetResultHtml(ok: boolean, message: string) {
  return page(
    ok ? 'Senha atualizada — Vandrae' : 'Link inválido — Vandrae',
    `<p class="kicker">Vandrae</p>
     <h1>${ok ? 'Senha atualizada' : 'Não foi possível redefinir'}</h1>
     <p>${escapeHtml(message)}</p>`,
  )
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
