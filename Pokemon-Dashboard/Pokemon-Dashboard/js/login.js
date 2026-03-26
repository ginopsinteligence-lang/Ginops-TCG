// LOGIN – GINOPS TCG (Firebase)
document.addEventListener('DOMContentLoaded', function() {
    var loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    loginForm.addEventListener('submit', function(e) {
        e.preventDefault();
        var email    = document.getElementById('email').value.trim();
        var password = document.getElementById('password').value;
        var errorMsg = document.getElementById('errorMsg');

        getUserByEmail(email, function(user) {
            if (user && user.password === password) {
                setCurrentUser(user);
                window.location.href = 'dashboard.html';
            } else {
                if (errorMsg) {
                    errorMsg.style.display = 'block';
                    setTimeout(function() { errorMsg.style.display = 'none'; }, 3000);
                }
            }
        });
    });

    ['adminAccess','adminAccess2'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
            el.addEventListener('click', function(e) {
                e.preventDefault();
                var pw = prompt('🔑 SENHA ADMIN:');
                if (pw === 'gu281090') {
                    setCurrentUser({id:'admin',name:'Administrador',email:'admin@ginops.com',isAdmin:true});
                    window.location.href = 'admin.html';
                } else if (pw !== null) {
                    alert('❌ SENHA INCORRETA!');
                }
            });
        }
    });
});
