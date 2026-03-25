// REGISTRO – GINOPS TCG (Firebase)
document.addEventListener('DOMContentLoaded', function() {
    var registerForm = document.getElementById('registerForm');
    if (!registerForm) return;

    registerForm.addEventListener('submit', function(e) {
        e.preventDefault();

        var name            = document.getElementById('name').value.trim();
        var phone           = document.getElementById('phone').value.trim();
        var email           = document.getElementById('email').value.trim();
        var password        = document.getElementById('password').value;
        var confirmPassword = document.getElementById('confirmPassword').value;
        var errorMsg        = document.getElementById('errorMsg');
        var successMsg      = document.getElementById('successMsg');

        function showError(msg) {
            errorMsg.textContent     = msg;
            errorMsg.style.display   = 'block';
            setTimeout(function() { errorMsg.style.display = 'none'; }, 4000);
        }

        if (name.length < 2)          { showError('❌ Digite um nome válido!'); return; }
        if (phone.length < 8)         { showError('❌ Digite um telefone válido!'); return; }
        if (password.length < 6)      { showError('❌ Senha mínimo 6 caracteres!'); return; }
        if (password !== confirmPassword) { showError('❌ Senhas não coincidem!'); return; }

        // Verificar se email já existe
        getUserByEmail(email, function(existing) {
            if (existing) {
                showError('❌ Email já cadastrado!');
                return;
            }

            var newUser = {
                name:      name,
                phone:     phone,
                email:     email,
                password:  password,
                points:    0,
                pokedex:   [],
                pointsHistory:   [],
                resgatarHistory: [],
                createdAt: new Date().toISOString()
            };

            createUser(newUser, function(user) {
                if (user) {
                    successMsg.style.display = 'block';
                    setTimeout(function() {
                        window.location.href = 'index.html';
                    }, 1500);
                } else {
                    showError('❌ Erro ao criar conta. Tente novamente!');
                }
            });
        });
    });
});
