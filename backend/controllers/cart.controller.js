const Cart = require('../models/cart.model');
const ProductVariant = require('../models/productVariant.model');
const Product = require('../models/product.model');

exports.getCart = async (req, res, next) => {
    try {
        const items = await Cart.getCartItems(req.user.id);
        const total = items.reduce((sum, item) => {
            const price = item.offer_price || item.price;
            return sum + (price * item.quantity);
        }, 0);
        res.json({ success: true, count: items.length, total: Number(total.toFixed(2)), data: items });
    } catch (error) {
        next(error);
    }
};

// Resolve price/stock/inventory-tracking for the target line (variant if given, else product)
async function resolveTarget(productId, variantId) {
    const product = await Product.findById(productId);
    if (!product) return { error: 'Product not found' };

    if (variantId != null) {
        const variant = await ProductVariant.findById(variantId);
        if (!variant || variant.product_id !== product.id) {
            return { error: 'Variant not found for this product' };
        }
        return {
            product,
            variant,
            stock: Number(variant.stock_quantity),
            // Variant-level lines always respect stock
            tracksInventory: true
        };
    }

    const tracksInventory = product.track_inventory === 1 || product.track_inventory === true;
    return { product, variant: null, stock: Number(product.stock_quantity), tracksInventory };
}

exports.addToCart = async (req, res, next) => {
    try {
        const { product_id, quantity = 1, variant_id = null } = req.body;
        const target = await resolveTarget(product_id, variant_id);
        if (target.error) {
            return res.status(404).json({ success: false, message: target.error });
        }

        const currentCartItems = await Cart.getCartItems(req.user.id);
        const existingItem = currentCartItems.find(
            it => it.product_id === product_id && (it.variant_id ?? null) === (variant_id ?? null)
        );
        const currentQty = existingItem ? existingItem.quantity : 0;

        if (target.tracksInventory && currentQty + quantity > target.stock) {
            return res.status(400).json({ success: false, message: `Only ${target.stock} available in stock` });
        }

        await Cart.addItem(req.user.id, product_id, quantity, variant_id);
        res.json({ success: true, message: 'Item added to cart' });
    } catch (error) {
        next(error);
    }
};

exports.updateCartItem = async (req, res, next) => {
    try {
        const { product_id, quantity, variant_id = null } = req.body;
        const target = await resolveTarget(product_id, variant_id);
        if (target.error) {
            return res.status(404).json({ success: false, message: target.error });
        }

        if (target.tracksInventory && quantity > target.stock) {
            return res.status(400).json({ success: false, message: `Only ${target.stock} available in stock` });
        }

        await Cart.updateQuantity(req.user.id, product_id, quantity, variant_id);
        res.json({ success: true, message: 'Cart updated' });
    } catch (error) {
        next(error);
    }
};

exports.removeFromCart = async (req, res, next) => {
    try {
        const variantId = req.query.variant_id ? Number(req.query.variant_id) : null;
        await Cart.removeItem(req.user.id, req.params.id, variantId);
        res.json({ success: true, message: 'Item removed from cart' });
    } catch (error) {
        next(error);
    }
};

exports.clearCart = async (req, res, next) => {
    try {
        await Cart.clearCart(req.user.id);
        res.json({ success: true, message: 'Cart cleared' });
    } catch (error) {
        next(error);
    }
};
