import { Page, Locator } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config();

export class LoginPage {
    private readonly page: Page;

    // Locators
    readonly txtUsername: Locator;
    readonly txtPassword: Locator;
    readonly btnLogin: Locator;
    readonly msgError: Locator;
    readonly btnCloseError: Locator;

    constructor(page: Page) {
        this.page = page;

        // Initialize locators with data-test attribute selectors
        this.txtUsername = page.locator('[data-test="username"]');
        this.txtPassword = page.locator('[data-test="password"]');
        this.btnLogin = page.locator('[data-test="login-button"]');
        this.msgError = page.locator('[data-test="error"]');
        this.btnCloseError = page.locator('[data-test="error-button"]');
    }

    /**
     * Opens the application (WEB_BASE_URL), optionally followed by a relative path
     * @param path - Relative path appended to WEB_BASE_URL (e.g. 'inventory.html'); empty opens the login page
     */
    async goto(path: string = ''): Promise<void> {
        await this.page.goto(`${process.env.WEB_BASE_URL as string}${path}`);
    }

    /**
     * Fills the username field
     * @param username - Username to enter
     */
    async setUsername(username: string): Promise<void> {
        await this.txtUsername.fill(username);
    }

    /**
     * Fills the password field
     * @param password - Password to enter
     */
    async setPassword(password: string): Promise<void> {
        await this.txtPassword.fill(password);
    }

    /**
     * Clicks the Login button
     */
    async clickLogin(): Promise<void> {
        await this.btnLogin.click();
    }

    /**
     * Logs in. Values are trimmed and a field is filled only when its trimmed value is not empty,
     * so blank values from data files leave the field empty.
     * @param username - Username to enter
     * @param password - Password to enter
     */
    async login(username: string, password: string): Promise<void> {
        try {
            const user = username.trim();
            const pass = password.trim();
            if (user !== '') {
                await this.setUsername(user);
            }
            if (pass !== '') {
                await this.setPassword(pass);
            }
            await this.clickLogin();
        } catch (error) {
            console.log(`Error during login: ${error}`);
            throw error;
        }
    }

    /**
     * Closes the login error message
     */
    async closeError(): Promise<void> {
        await this.btnCloseError.click();
    }
}
