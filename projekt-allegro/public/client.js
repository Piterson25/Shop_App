window.addEventListener("load", function (event) {
  const socket = io.connect('https://' + location.host);

  const form = document.querySelector('#form2');
  if (form) {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const title = form.title.value;
      const description = form.description.value;
      const price = form.price.value;
      const discountPercentage = form.discountPercentage.value;
      const stock = form.stock.value;
      const brand = form.brand.value;
      const category = form.category.value;
      const thumbnail = form.thumbnail.value;
      const images = [form.images[0].value, form.images[1].value, form.images[2].value];

      const body = { title, description, price, discountPercentage, stock, brand, category, thumbnail, images };

      fetch('/add', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      })
        .then((response) => {
          return response.json();
        })
        .then((data) => {
          console.log(data);
          window.location.replace('/');
        });
    });
  }

  const deleteButtons = document.querySelectorAll('#delete-button');
  deleteButtons.forEach(button => {
    button.addEventListener('click', e => {
      e.preventDefault();
      const productId = e.target.parentNode.parentNode.dataset.productId;
      fetch(`/products/${productId}`, {
        method: 'DELETE'
      })
        .then(res => res.json())
        .then(data => {
          console.log(data.message);
          const productElement = e.target.parentNode.parentNode;
          productElement.remove();
        });
    });
  });

  const edit = document.getElementById('editing');

  if (edit) edit.addEventListener('submit', handleEditForm);

  function handleEditForm(event) {
    event.preventDefault();
    const formData = new FormData(event.target);
    const productId = event.target.getAttribute('action').split('/')[2];
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    data.images = data.images.split(",");
    fetch(`/products/edit/${productId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    })
      .then(response => response.json())
      .then(data => {
        console.log(data.message);
        window.location.replace(`/products/'+${productId}`);
      });
  }

  const chatMessages = document.getElementById('chat-messages');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');

  function appendMessage(message, color) {
    const messageElement = document.createElement('div')
    messageElement.innerText = message
    messageElement.style.backgroundColor = color;
    chatMessages.append(messageElement)
  }

  if (chatMessages) {
    const user = document.getElementById('chat-user').innerHTML;
    socket.emit('new-user', user)

    sendButton.addEventListener('click', () => {
      const message = messageInput.value;
      socket.emit('new-message', `${user}: ${message}`);
      messageInput.value = '';
    });
  
    socket.on('user-connected', user => {
      appendMessage(`${user} dołączył/a do czatu`, 'aliceblue')
    })
  
    socket.on('user-disconnected', user => {
      appendMessage(`Użytkownik wyszedł z czatu`, 'aliceblue')
    })

    socket.on('message', (message) => {
      appendMessage(`${message}`, 'white')
    })
  }

});
