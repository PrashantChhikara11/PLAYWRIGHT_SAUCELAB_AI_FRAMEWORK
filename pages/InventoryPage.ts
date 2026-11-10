import { Page, Locator, expect } from '@playwright/test';

export class InventoryPage {
    private readonly page: Page;

    // Locators
    readonly lblTitle: Locator;
    readonly drpSort: Locator;
    readonly lblActiveSort: Locator;
    readonly inventoryItems: Locator;
    readonly itemNames: Locator;
    readonly itemPrices: Locator;
    readonly itemImages: Locator;
    // Header elements (shared by every logged-in page)
    readonly lnkCart: Locator;
    readonly cartBadge: Locator;

    constructor(page: Page) {
        this.page = page;

        // Initialize locators with data-test attribute selectors
        this.lblTitle = page.locator('[data-test="title"]');
        this.drpSort = page.locator('[data-test="product-sort-container"]');
        this.lblActiveSort = page.locator('[data-test="active-option"]');
        this.inventoryItems = page.locator('[data-test="inventory-item"]');
        this.itemNames = page.locator('[data-test="inventory-item-name"]');
        this.itemPrices = page.locator('[data-test="inventory-item-price"]');
        this.itemImages = page.locator('[data-test="inventory-item"] img');
        this.lnkCart = page.locator('[data-test="shopping-cart-link"]');
        this.cartBadge = page.locator('[data-test="shopping-cart-badge"]');
    }

    /**
     * Builds the button slug used in data-test values (lower case, spaces replaced by '-')
     * @param productName - Product name as displayed
     * @returns string - Slug, e.g. 'sauce-labs-backpack'
     */
    private getSlug(productName: string): string {
        return productName.toLowerCase().replace(/ /g, '-');
    }

    /**
     * Returns the inventory item card for a product
     * @param productName - Exact product name
     * @returns Locator - The matching inventory item
     */
    getItem(productName: string): Locator {
        return this.inventoryItems.filter({ has: this.page.getByText(productName, { exact: true }) });
    }

    /**
     * Returns the price element of a product card
     * @param productName - Exact product name
     * @returns Locator - The price element
     */
    getItemPrice(productName: string): Locator {
        return this.getItem(productName).locator('[data-test="inventory-item-price"]');
    }

    /**
     * Clicks Add to cart for a product
     * @param productName - Exact product name
     */
    async addToCart(productName: string): Promise<void> {
        await this.page.locator(`[data-test="add-to-cart-${this.getSlug(productName)}"]`).click();
    }

    /**
     * Clicks Remove for a product
     * @param productName - Exact product name
     */
    async removeFromCart(productName: string): Promise<void> {
        await this.page.locator(`[data-test="remove-${this.getSlug(productName)}"]`).click();
    }

    /**
     * Opens the product details page by clicking the product name
     * @param productName - Exact product name
     */
    async clickProductName(productName: string): Promise<void> {
        await this.getItem(productName).locator('[data-test="inventory-item-name"]').click();
    }

    /**
     * Selects a sort option once, without checking the result
     * (used where sorting is expected to fail, e.g. error_user)
     * @param value - Option value (az, za, lohi, hilo)
     */
    async selectSortOption(value: string): Promise<void> {
        await this.drpSort.selectOption(value);
    }

    /**
     * Sorts the products and waits until the app has applied the sort.
     * Under load the select can change before React attaches its change handler,
     * leaving the list unsorted; the selection is retried until the active-option
     * label shows the chosen option.
     * @param value - Option value (az, za, lohi, hilo)
     */
    async sortProductsBy(value: string): Promise<void> {
        const label = (await this.drpSort.locator(`option[value="${value}"]`).innerText()).trim();
        await expect(async () => {
            await this.drpSort.selectOption(value);
            await expect(this.lblActiveSort).toHaveText(label, { timeout: 2000 });
        }).toPass({ timeout: 15000 });
    }

    /**
     * Reads all product names in display order
     * @returns Promise<string[]> - Product names
     */
    async getAllProductNames(): Promise<string[]> {
        return await this.itemNames.allInnerTexts();
    }

    /**
     * Reads all product prices in display order
     * @returns Promise<string[]> - Prices as displayed (e.g. '$29.99')
     */
    async getAllProductPrices(): Promise<string[]> {
        return await this.itemPrices.allInnerTexts();
    }

    /**
     * Opens the cart via the header cart icon
     */
    async openCart(): Promise<void> {
        await this.lnkCart.click();
    }
}
