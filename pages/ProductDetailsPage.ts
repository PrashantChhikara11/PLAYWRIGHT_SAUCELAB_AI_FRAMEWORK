import { Page, Locator } from '@playwright/test';

export class ProductDetailsPage {
    private readonly page: Page;

    // Locators
    readonly lblItemName: Locator;
    readonly lblItemPrice: Locator;
    readonly btnAddToCart: Locator;
    readonly btnRemove: Locator;
    readonly btnBackToProducts: Locator;

    constructor(page: Page) {
        this.page = page;

        // Initialize locators with data-test attribute selectors
        this.lblItemName = page.locator('[data-test="inventory-item-name"]');
        this.lblItemPrice = page.locator('[data-test="inventory-item-price"]');
        this.btnAddToCart = page.locator('[data-test="add-to-cart"]');
        this.btnRemove = page.locator('[data-test="remove"]');
        this.btnBackToProducts = page.locator('[data-test="back-to-products"]');
    }

    /**
     * Clicks Add to cart on the details page
     */
    async clickAddToCart(): Promise<void> {
        await this.btnAddToCart.click();
    }

    /**
     * Clicks Remove on the details page
     */
    async clickRemove(): Promise<void> {
        await this.btnRemove.click();
    }

    /**
     * Clicks Back to products
     */
    async clickBackToProducts(): Promise<void> {
        await this.btnBackToProducts.click();
    }
}
