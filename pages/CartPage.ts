import { Page, Locator } from '@playwright/test';

export class CartPage {
    private readonly page: Page;

    // Locators
    readonly lblTitle: Locator;
    readonly cartItems: Locator;
    readonly btnContinueShopping: Locator;
    readonly btnCheckout: Locator;

    constructor(page: Page) {
        this.page = page;

        // Initialize locators with data-test attribute selectors
        this.lblTitle = page.locator('[data-test="title"]');
        this.cartItems = page.locator('[data-test="inventory-item"]');
        this.btnContinueShopping = page.locator('[data-test="continue-shopping"]');
        this.btnCheckout = page.locator('[data-test="checkout"]');
    }

    /**
     * Returns the cart item row for a product
     * @param productName - Exact product name
     * @returns Locator - The matching cart item
     */
    getItem(productName: string): Locator {
        return this.cartItems.filter({ has: this.page.getByText(productName, { exact: true }) });
    }

    /**
     * Returns the name element of a cart item
     * @param productName - Exact product name
     * @returns Locator - The name element
     */
    getItemName(productName: string): Locator {
        return this.getItem(productName).locator('[data-test="inventory-item-name"]');
    }

    /**
     * Returns the quantity element of a cart item
     * @param productName - Exact product name
     * @returns Locator - The quantity element
     */
    getItemQuantity(productName: string): Locator {
        return this.getItem(productName).locator('[data-test="item-quantity"]');
    }

    /**
     * Returns the price element of a cart item
     * @param productName - Exact product name
     * @returns Locator - The price element
     */
    getItemPrice(productName: string): Locator {
        return this.getItem(productName).locator('[data-test="inventory-item-price"]');
    }

    /**
     * Removes a product from the cart
     * @param productName - Exact product name
     */
    async removeItem(productName: string): Promise<void> {
        const slug = productName.toLowerCase().replace(/ /g, '-');
        await this.page.locator(`[data-test="remove-${slug}"]`).click();
    }

    /**
     * Clicks Continue Shopping
     */
    async clickContinueShopping(): Promise<void> {
        await this.btnContinueShopping.click();
    }

    /**
     * Clicks Checkout
     */
    async clickCheckout(): Promise<void> {
        await this.btnCheckout.click();
    }
}
