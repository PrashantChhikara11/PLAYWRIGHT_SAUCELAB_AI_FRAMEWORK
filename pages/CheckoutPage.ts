import { Page, Locator } from '@playwright/test';

/**
 * Covers the three checkout views: step one (information), overview (step two) and complete.
 */
export class CheckoutPage {
    private readonly page: Page;

    // Locators - shared
    readonly lblTitle: Locator;
    readonly btnCancel: Locator;
    // Locators - step one (information)
    readonly txtFirstName: Locator;
    readonly txtLastName: Locator;
    readonly txtPostalCode: Locator;
    readonly btnContinue: Locator;
    readonly msgError: Locator;
    // Locators - overview
    readonly lblSubtotal: Locator;
    readonly lblTax: Locator;
    readonly lblTotal: Locator;
    readonly btnFinish: Locator;
    // Locators - complete
    readonly lblCompleteHeader: Locator;
    readonly lblCompleteText: Locator;
    readonly btnBackHome: Locator;

    constructor(page: Page) {
        this.page = page;

        // Initialize locators with data-test attribute selectors
        this.lblTitle = page.locator('[data-test="title"]');
        this.btnCancel = page.locator('[data-test="cancel"]');
        this.txtFirstName = page.locator('[data-test="firstName"]');
        this.txtLastName = page.locator('[data-test="lastName"]');
        this.txtPostalCode = page.locator('[data-test="postalCode"]');
        this.btnContinue = page.locator('[data-test="continue"]');
        this.msgError = page.locator('[data-test="error"]');
        this.lblSubtotal = page.locator('[data-test="subtotal-label"]');
        this.lblTax = page.locator('[data-test="tax-label"]');
        this.lblTotal = page.locator('[data-test="total-label"]');
        this.btnFinish = page.locator('[data-test="finish"]');
        this.lblCompleteHeader = page.locator('[data-test="complete-header"]');
        this.lblCompleteText = page.locator('[data-test="complete-text"]');
        this.btnBackHome = page.locator('[data-test="back-to-products"]');
    }

    /**
     * Fills the checkout information form. Values are trimmed and a field is filled only
     * when its trimmed value is not empty, so blank values leave the field empty.
     * @param firstName - First name
     * @param lastName - Last name
     * @param postalCode - Zip / postal code
     */
    async fillInformation(firstName: string, lastName: string, postalCode: string): Promise<void> {
        const fields: [Locator, string][] = [
            [this.txtFirstName, firstName.trim()],
            [this.txtLastName, lastName.trim()],
            [this.txtPostalCode, postalCode.trim()]
        ];
        for (const [field, value] of fields) {
            if (value !== '') {
                await field.fill(value);
            }
        }
    }

    /**
     * Clicks Continue on step one
     */
    async clickContinue(): Promise<void> {
        await this.btnContinue.click();
    }

    /**
     * Clicks Cancel (step one returns to the cart, overview returns to the inventory)
     */
    async clickCancel(): Promise<void> {
        await this.btnCancel.click();
    }

    /**
     * Clicks Finish on the overview
     */
    async clickFinish(): Promise<void> {
        await this.btnFinish.click();
    }

    /**
     * Clicks Back Home on the complete page
     */
    async clickBackHome(): Promise<void> {
        await this.btnBackHome.click();
    }
}
