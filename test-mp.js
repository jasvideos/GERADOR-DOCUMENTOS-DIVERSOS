import { MercadoPagoConfig, Payment } from 'mercadopago';

async function run() {
  try {
    console.log("Testing with undefined...");
    const mpClient = new MercadoPagoConfig({ accessToken: "undefined" });
    const paymentClient = new Payment(mpClient);
    await paymentClient.create({ body: { transaction_amount: 1, payment_method_id: 'pix', payer: { email: 'test@t.com'} } });
    console.log("Success with 'undefined'");
  } catch (e) {
    console.log("Error with 'undefined':", e.stack);
  }

  try {
    console.log("Testing with APP_USR-fake...");
    const mpClient = new MercadoPagoConfig({ accessToken: "APP_USR-fake" });
    const paymentClient = new Payment(mpClient);
    await paymentClient.create({ body: { transaction_amount: 1, payment_method_id: 'pix', payer: { email: 'test@t.com'} } });
    console.log("Success with 'APP_USR-fake'");
  } catch (e) {
    console.log("Error with 'APP_USR-fake':", e.stack);
  }

}

run();
