export const generateReceiptHTML = ({
  storeName = "MY STORE",
  cart,
  subtotal,
  discount,
  total,
  payment,
}) => {
  const items = cart
    .map(
      (i) =>
        `<tr>
          <td>${i.name}</td>
          <td style="text-align:right">${i.qty} x ${i.price}</td>
          <td style="text-align:right">${(i.qty * i.price).toFixed(2)}</td>
        </tr>`,
    )
    .join("");

  return `
  <html>
    <body style="width:384px;font-family:monospace;font-size:12px">
      <center>
        <b>${storeName}</b><br/>
        ------------------------------
      </center>

      <table width="100%">
        ${items}
      </table>

      ------------------------------
      <p>Subtotal: ₱${subtotal.toFixed(2)}</p>
      <p>Discount: ₱${discount.toFixed(2)}</p>
      <p><b>TOTAL: ₱${total.toFixed(2)}</b></p>

      ------------------------------
      <p>Payment:</p>
      <p>${payment}</p>

      ------------------------------
      <center>THANK YOU!</center>
    </body>
  </html>
  `;
};
