'use strict';

/**
 *  order controller
 */

const { createCoreController } = require('@strapi/strapi').factories;
const stripe = require('stripe')(process.env.STRIPE_SK)

const fromDecimalToInt = (number) => parseInt(number*100)

module.exports = createCoreController('api::order.order', ({ strapi }) =>  ({  
   
    async find(ctx) {
      const {user} = ctx.state
      //const { id } = ctx.params;
      //ctx.query = { ...ctx.query}
      const { query } = ctx;
      
  
      //const entity = await strapi.service('api::order.order').find(query);
      const entity = await strapi.db.query('api::order.order').findMany({
        ...query,
        where: { user:  user.id},
        populate: { user: true, product:true }
      });

      const sanitizedEntity = await this.sanitizeOutput(entity, ctx);
  
      return this.transformResponse(sanitizedEntity);
    },

  async findOne(ctx) {
    const {user} = ctx.state
    const { id } = ctx.params;
    const { query } = ctx;

    //const entity = await strapi.service('api::order.order').findOne(query);
    const entity = await strapi.db.query('api::order.order').findOne({
        ...query,
        where: { id, user: user.id},
        // populate: { user: true },
        // populate: ['order'],
      });
    const sanitizedEntity = await this.sanitizeOutput(entity, ctx);

    return this.transformResponse(sanitizedEntity);
  },

  async create(ctx){
    const{product} = ctx.request.body
    
    if(!product){
      return ctx.throw(400, 'Please specify a product')
    }

    const realProduct = await strapi.db.query('api::product.product').findOne({
      where: {id:product.id}
    })

    if(!realProduct){
      return ctx.throw(404, 'No product with such id')
    }

    const {user} = ctx.state

    const BASE_URL = ctx.request.headers.origin || 'http://localhost:3000'


    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: user.email,
      mode: 'payment',
      success_url: `${BASE_URL}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: BASE_URL,
      line_items: [
        {
          price_data:{
            currency: 'usd',
            product_data:{
              name:realProduct.name
            },
            unit_amount: fromDecimalToInt(realProduct.price)
          },
          quantity: 1
        },
      ]
    })

    const newOrder = await strapi.db.query('api::order.order').create({
      data: {
      user: user.id,
      product: realProduct.id,
      total: realProduct.price,
      status: 'unpaid',
      checkout_session: session.id
    }})

    return { id : session.id}
  },

  async confirm(ctx){
    const {checkout_session} = ctx.request.body
    console.log('Session Log : ', checkout_session)
    if(!checkout_session){
      ctx.throw(400, "The payment wasn't successful, please call support")
    }
    const session = await stripe.checkout.sessions.retrieve(checkout_session)

    if(session.payment_status === 'paid'){
      const updateOrder = await strapi.db.query('api::order.order').update({
        where: {checkout_session},
        data: {
          status: 'paid'
        }
      })

    //return sanitizedEntity(updateOrder, {model :strapi.models.oreder})
    const sanitizedEntity = await this.sanitizeOutput(updateOrder, ctx);

    return this.transformResponse(sanitizedEntity);
    }else{
      ctx.throw(400, "The payment wasn't successful, please call support")
    }

  }

  }));
