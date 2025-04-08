const Product = require("../../model/productModel");
const Variant = require("../../model/variantsModel");

const validateSkuUniqueness = async (sku, collection) => {
  if (!sku) return true;

  if (collection === "product") {
    const variantExists = await Variant.findOne({ sku });
    if (variantExists) {
      throw new Error("SKU already exists in Variant collection");
    }
  } else if (collection === "variant") {
    const productExists = await Product.findOne({ sku });
    if (productExists) {
      throw new Error("SKU already exists in Product collection");
    }
  }
  return true;
};

module.exports = {validateSkuUniqueness};
