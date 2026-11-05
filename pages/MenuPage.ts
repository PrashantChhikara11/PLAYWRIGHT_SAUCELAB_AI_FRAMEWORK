import { Page, Locator, expect } from '@playwright/test';

export class MenuPage {
    private readonly page: Page;

    // Locators
    readonly btnOpenMenu: Locator;
    readonly btnCloseMenu: Locator;
    readonly menuWrapper: Locator;
    readonly lnkAllItems: Locator;
    readonly lnkAbout: Locator;
    readonly lnkLogout: Locator;
    readonly lnkResetAppState: Locator;

    constructor(page: Page) {
        this.page = page;

        // Burger buttons have no data-test attribute, so role locators are used
        this.btnOpenMenu = page.getByRole('button', { name: 'Open Menu' });
        this.btnCloseMenu = page.getByRole('button', { name: 'Close Menu' });
        // Menu container has no data-test; its aria-hidden is "false" only while the menu is open
        this.menuWrapper = page.locator('.bm-menu-wrap');
        // Initialize locators with data-test attribute selectors
        this.lnkAllItems = page.locator('[data-test="inventory-sidebar-link"]');
        this.lnkAbout = page.locator('[data-test="about-sidebar-link"]');
        this.lnkLogout = page.locator('[data-test="logout-sidebar-link"]');
        this.lnkResetAppState = page.locator('[data-test="reset-sidebar-link"]');
    }

    /**
     * Opens the burger menu and waits until it is open (menu wrapper aria-hidden="false").
     * The SPA can ignore a click made right after a view renders, so the click is retried
     * with Playwright's toPass until the menu is actually open.
     */
    async openMenu(): Promise<void> {
        await expect(async () => {
            if ((await this.menuWrapper.getAttribute('aria-hidden')) !== 'false') {
                await this.btnOpenMenu.click({ timeout: 2000 });
            }
            await expect(this.menuWrapper).toHaveAttribute('aria-hidden', 'false', { timeout: 2000 });
        }).toPass({ timeout: 15000 });
    }

    /**
     * Closes the burger menu (no-op when it is already closed)
     */
    async closeMenu(): Promise<void> {
        await expect(async () => {
            if ((await this.menuWrapper.getAttribute('aria-hidden')) !== 'true') {
                await this.btnCloseMenu.click({ timeout: 2000 });
            }
            await expect(this.menuWrapper).toHaveAttribute('aria-hidden', 'true', { timeout: 2000 });
        }).toPass({ timeout: 15000 });
    }

    /**
     * Opens the menu (if needed) and clicks one of its links. The app can re-render the header
     * and close the menu right after it opened, so open + click is retried as one action.
     * @param link - Menu link to click
     */
    private async clickMenuLink(link: Locator): Promise<void> {
        await expect(async () => {
            await this.openMenu();
            await link.click({ timeout: 3000 });
        }).toPass({ timeout: 20000 });
    }

    /**
     * Clicks All Items in the burger menu
     */
    async clickAllItems(): Promise<void> {
        await this.clickMenuLink(this.lnkAllItems);
    }

    /**
     * Clicks Logout in the burger menu
     */
    async clickLogout(): Promise<void> {
        await this.clickMenuLink(this.lnkLogout);
    }

    /**
     * Clicks Reset App State in the burger menu
     */
    async clickResetAppState(): Promise<void> {
        await this.clickMenuLink(this.lnkResetAppState);
    }
}
