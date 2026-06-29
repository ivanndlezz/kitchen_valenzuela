// update_images.js
const fs = require('fs');
const path = '/Users/a74525/Documents/sites/kitchen_valenzuela/inventory/data/inventory-products.json';
let data = JSON.parse(fs.readFileSync(path, 'utf8'));
const prefix = 'https://kitchencleanvalenzuela.net/assets/uploads/';
for (let item of data) {
  if (item.Imagen && !item.Imagen.startsWith('http')) {
    item.Imagen = prefix + item.Imagen;
  }
}
fs.writeFileSync(path, JSON.stringify(data, null, 2), 'utf8');
console.log('Image URLs updated.');
