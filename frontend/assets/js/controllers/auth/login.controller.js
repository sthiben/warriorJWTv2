document.addEventListener('DOMContentLoaded', () => {
  const loginForm = document.getElementById('loginForm');
  const loginButton = document.getElementById('loginBtn');
  const spinner = document.getElementById('loginSpinner');

  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    // Deshabilitar botón y mostrar spinner
    loginButton.disabled = true;
    spinner.classList.remove('d-none');

    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    try {
      const response = await fetch('http://localhost:3200/api_v1/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Manejar errores del servidor (ej: credenciales incorrectas)
        alert(data.message || 'Error al iniciar sesión.');
        return;
      }
      
      // Guardar el token en localStorage
      if (data.token) {
        localStorage.setItem('warriorJWT', data.token);
        // Redirigir al dashboard
        window.location.href = '../dashboard/index.html';
      } else {
        alert('No se recibió un token.');
      }

    } catch (error) {
      console.error('Error de conexión:', error);
      alert('No se pudo conectar con el servidor. Inténtalo de nuevo más tarde.');
    } finally {
      // Habilitar botón y ocultar spinner
      loginButton.disabled = false;
      spinner.classList.add('d-none');
    }
  });

  // Lógica para mostrar/ocultar contraseña
    const togglePassword = document.querySelector('#togglePassword');
  if (togglePassword) {
    togglePassword.addEventListener('click', function () {
      const passwordInput = document.getElementById('password');
      const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
      passwordInput.setAttribute('type', type);
      
          const icon = this.querySelector('i');
          icon.classList.toggle('fa-eye');
          icon.classList.toggle('fa-eye-slash');
      });
  }
});

