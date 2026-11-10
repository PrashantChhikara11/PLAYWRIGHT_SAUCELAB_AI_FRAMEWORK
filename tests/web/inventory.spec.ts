/**
 * Test Cases: 7) Product Listing  8) Product Sorting  9) Product Details
 * Traces: W-INV-01, W-INV-02, W-DETAIL-01, W-DETAIL-02
 *
 * Tags: @master @sanity @regression @web
 */

// using custom fixtures
import { test, expect } from '../../fixtures/pageFixtures';
import { Helper } from '../../utils/helper';
import productData from '../../testdata/web/saucedemo_products.json';

test.describe('Inventory', () => {

    test.beforeEach(async ({ loginPage, inventoryPage }) => {
        const { username, password } = Helper.getLoginDetails();
        await loginPage.goto();
        await loginPage.login(username, password);
        await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
    });

    test('Product Listing @master @sanity @regression @web', async ({ inventoryPage }) => {

        await test.step('1) Verify the number of products', async () => {
            await expect(inventoryPage.inventoryItems).toHaveCount(productData.products.length);
        });

        await test.step('2) Verify every product name and price', async () => {
            for (const product of productData.products) {
                await expect(inventoryPage.getItem(product.name)).toHaveCount(1);
                await expect(inventoryPage.getItemPrice(product.name)).toHaveText(product.price);
            }
        });

        console.log('✅ Product listing verified successfully!');
    });

    for (const option of productData.sortOptions) {
        test(`Product Sorting - ${option.label} @master @regression @web`, async ({ inventoryPage }) => {

            await test.step(`1) Select sort option "${option.value}"`, async () => {
                await inventoryPage.sortProductsBy(option.value);
                await expect(inventoryPage.lblActiveSort).toHaveText(option.label);
            });

            await test.step('2) Verify the product order', async () => {
                const names = await inventoryPage.getAllProductNames();
                const prices = (await inventoryPage.getAllProductPrices()).map((price) => Helper.convertPriceToNumber(price));

                if (option.value === 'az') {
                    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
                } else if (option.value === 'za') {
                    expect(names).toEqual([...names].sort((a, b) => b.localeCompare(a)));
                } else {
                    for (let i = 0; i < prices.length - 1; i++) {
                        if (option.value === 'lohi') {
                            expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
                        } else {
                            expect(prices[i]).toBeGreaterThanOrEqual(prices[i + 1]);
                        }
                    }
                }
            });

            console.log(`✅ Sorting "${option.label}" verified successfully!`);
        });
    }

    test('Product Details @master @regression @web', async ({ inventoryPage, productDetailsPage }) => {
        const { productName, productQuantity } = Helper.getProductDetails();

        await test.step('1) Verify the details page of every product', async () => {
            for (const product of productData.products) {
                await inventoryPage.clickProductName(product.name);
                await expect(productDetailsPage.btnBackToProducts).toBeVisible();
                await expect(productDetailsPage.lblItemName).toHaveText(product.name);
                await expect(productDetailsPage.lblItemPrice).toHaveText(product.price);

                await productDetailsPage.clickBackToProducts();
                await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory);
            }
        });

        await test.step('2) Add and remove the product from its details page', async () => {
            await inventoryPage.clickProductName(productName);
            await expect(productDetailsPage.btnBackToProducts).toBeVisible();

            await productDetailsPage.clickAddToCart();
            await expect(inventoryPage.cartBadge).toHaveText(productQuantity);

            await productDetailsPage.clickRemove();
            await expect(inventoryPage.cartBadge).toHaveCount(0);
        });

        console.log('✅ Product details verified successfully!');
    });
});
