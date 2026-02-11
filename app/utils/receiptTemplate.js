export const generateReceiptText = ({
  storeName = "Calle Otso",
  cart,
  subtotal,
  discount,
  total,
  payment,
  transactionNumber,
  userName = "POS User",
}) => {
  let receipt = "";
  receipt += `\n${storeName}\n`;
  receipt += `Transaction #: ${transactionNumber}\n`;
  receipt += `Cashier: ${userName}\n`;
  receipt += `------------------------------\n`;

  cart.forEach((i) => {
    const itemTotal = (
      i.qty * Number(i.RetailPrice || 0) -
      (i.discount || 0)
    ).toFixed(2);
    receipt += `${i.Name.substring(0, 15).padEnd(15)} ${i.qty} x ₱${Number(i.RetailPrice || 0).toFixed(2)}${i.discount ? `(D:${i.discountType}${i.discount})` : ""} ₱${itemTotal}\n`;
  });

  receipt += `------------------------------\n`;
  receipt += `Subtotal: ₱${subtotal.toFixed(2)}\n`;
  receipt += `Discount: ₱${discount.toFixed(2)}\n`;
  receipt += `TOTAL: ₱${total.toFixed(2)}\n`;
  receipt += `Payment: ${payment}\n`;
  receipt += `------------------------------\n`;
  receipt += `THANK YOU!\n\n\n`;

  return receipt;
};
