document.addEventListener('DOMContentLoaded', () => {
    const registerForm = document.getElementById('registerForm');
    const registerButton = document.getElementById('registerBtn');
    const spinner = document.getElementById('registerSpinner');

    registerForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        registerButton.disabled = true;
        spinner.classList.remove('d-none');

        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;

        try {
            const response = await fetch('http://localhost:3200/api_v1/player/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ username, password }),
            });

            const data = await response.json();

            if (!response.ok) {
                alert(data.message || 'Error al registrar la cuenta.');
                return;
            }

            alert('¡Registro exitoso! Ahora puedes iniciar sesión.');
            window.location.href = './index.html'; // Redirigir al login

        } catch (error) {
            console.error('Error de conexión:', error);
            alert('No se pudo conectar con el servidor.');
        } finally {
            registerButton.disabled = false;
            spinner.classList.add('d-none');
        }
    });

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