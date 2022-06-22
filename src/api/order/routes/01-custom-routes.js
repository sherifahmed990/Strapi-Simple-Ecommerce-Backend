// path: ./src/api/restaurant/routes/01-custom-restaurant.js

module.exports = {
    routes: [
      { // Path defined with an URL parameter
        method: 'POST',
        path: '/orders/confirm', 
        handler: 'order.confirm',
      }
    ]
  }
   