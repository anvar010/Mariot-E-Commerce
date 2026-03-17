const Cart = require('../models/cart.model');

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

exports.addToCart = async (req, res, next) => {
    try {
        const { product_id, quantity = 1 } = req.body;
        const Product = require('../models/product.model');
        const product = await Product.findById(product_id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const currentCartItems = await Cart.getCartItems(req.user.id);
        const existingItem = currentCartItems.find(item => item.product_id === product_id);
        const currentQty = existingItem ? existingItem.quantity : 0;

        const isInventoryTracked = product.track_inventory === 1 || product.track_inventory === true;

        if (isInventoryTracked && currentQty + quantity > product.stock_quantity) {
            return res.status(400).json({ success: false, message: `Only ${product.stock_quantity} available in stock` });
        }

        await Cart.addItem(req.user.id, product_id, quantity);
        res.json({ success: true, message: 'Item added to cart' });
    } catch (error) {
        next(error);
    }
};

exports.updateCartItem = async (req, res, next) => {
    try {
        const { product_id, quantity } = req.body;
        const Product = require('../models/product.model');
        const product = await Product.findById(product_id);

        if (!product) {
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const isInventoryTracked = product.track_inventory === 1 || product.track_inventory === true;

        if (isInventoryTracked && quantity > product.stock_quantity) {
            return res.status(400).json({ success: false, message: `Only ${product.stock_quantity} available in stock` });
        }

        await Cart.updateQuantity(req.user.id, product_id, quantity);
        res.json({ success: true, message: 'Cart updated' });
    } catch (error) {
        next(error);
    }
};

exports.removeFromCart = async (req, res, next) => {
    try {
        await Cart.removeItem(req.user.id, req.params.id);
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
