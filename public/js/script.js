const form = document.getElementById('myForm');

        form.addEventListener('submit', function(event) {
            event.preventDefault();
            const formData = new FormData(form);

            fetch('/gobasket', {
                method: 'POST',
                body: formData
            })
            .then(response => response.json())
            .then(data => {
                // Обработка ответа от сервера, если необходимо
                console.log(data);
            })
            .catch(error => {
                console.error('Произошла ошибка:', error);
            });
        });