const gobasketForm = document.querySelectorAll('.gobasket');

gobasketForm.forEach(form => {
form.addEventListener('submit', (event) => {
  event.preventDefault();

  const formData = new FormData(form);
  console.log(formData.get('items_id'))
  fetch('/gobasket', {
    method: 'POST',
    headers: {
        'Content-type': "application/json",
    },
      body: JSON.stringify({
        items_id:formData.get('items_id')
    })
}).catch(error => {
    console.error('Произошла ошибка:', error);
  });  
})
})