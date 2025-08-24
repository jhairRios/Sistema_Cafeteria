// Mostrar/ocultar contraseña
    const passwordInput = document.getElementById('password');
    const togglePassword = document.getElementById('togglePassword');
    let passwordVisible = false;
    togglePassword.addEventListener('click', function() {
      passwordVisible = !passwordVisible;
      passwordInput.type = passwordVisible ? 'text' : 'password';
    });

    // (Opcional) Validación simple de ejemplo
    document.getElementById('loginForm').addEventListener('submit', function(e) {
      e.preventDefault();
      // Aquí puedes agregar tu lógica de autenticación
      alert('Login submitted!');
    });