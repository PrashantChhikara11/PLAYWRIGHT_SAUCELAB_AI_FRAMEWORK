import { test as base } from '@playwright/test';
import dotenv from 'dotenv';
import { LoginPage } from '../pages/LoginPage';
import { InventoryPage } from '../pages/InventoryPage';
import { ProductDetailsPage } from '../pages/ProductDetailsPage';
import { CartPage } from '../pages/CartPage';
import { CheckoutPage } from '../pages/CheckoutPage';
import { MenuPage } from '../pages/MenuPage';

dotenv.config();

type PageFixtures = {
    loginPage: LoginPage;
    inventoryPage: InventoryPage;
    productDetailsPage: ProductDetailsPage;
    cartPage: CartPage;
    checkoutPage: CheckoutPage;
    menuPage: MenuPage;
};

// Navigation is done explicitly in tests via loginPage.goto() (required by the SauceDemo test prompt),
// so no fixture navigates on its own.
export const test = base.extend<PageFixtures>({
    loginPage: async ({ page }, use) => {
        await use(new LoginPage(page));
    },
    inventoryPage: async ({ page }, use) => {
        await use(new InventoryPage(page));
    },
    productDetailsPage: async ({ page }, use) => {
        await use(new ProductDetailsPage(page));
    },
    cartPage: async ({ page }, use) => {
        await use(new CartPage(page));
    },
    checkoutPage: async ({ page }, use) => {
        await use(new CheckoutPage(page));
    },
    menuPage: async ({ page }, use) => {
        await use(new MenuPage(page));
    }
});

test.afterEach(async ({ page, context }) => {
    if (!page.isClosed()) {
        await page.close();
    }
    await context.close();
});

export { expect } from '@playwright/test';
