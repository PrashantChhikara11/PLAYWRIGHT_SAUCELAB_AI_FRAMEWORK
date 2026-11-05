/**
 * Test Case: 16) Login – Data Driven (External File)
 * Traces: W-LOGIN-06, W-LOGIN-01..04, W-USER-01
 *
 * One independent test per row, for each data source (JSON, CSV, XLSX).
 *
 * Tags: @master @datadriven @regression @web
 */

// using custom fixtures
import { test, expect } from '../../fixtures/pageFixtures';
import { DataProvider } from '../../utils/DataReader';
import productData from '../../testdata/web/saucedemo_products.json';

const dataSources = [
    { source: 'JSON', rows: DataProvider.readJson('testdata/web/saucedemo_logindata.json') },
    { source: 'CSV', rows: DataProvider.readCsv('testdata/web/saucedemo_logindata.csv') },
    { source: 'XLSX', rows: DataProvider.readExcel('testdata/web/saucedemo_logindata.xlsx') }
];

for (const { source, rows } of dataSources) {
    test.describe(`Login - Data Driven (${source})`, () => {

        rows.forEach((row, index) => {
            test(`[${index + 1}] ${row.testName ?? row.TestName} @master @datadriven @regression @web`, async ({ loginPage, inventoryPage, page }) => {

                await test.step('1) Open the login page', async () => {
                    await loginPage.goto();
                });

                await test.step('2) Log in with the row credentials (blank values stay empty)', async () => {
                    await loginPage.login(String(row.username), String(row.password));
                });

                await test.step(`3) Verify the expected result: ${row.expected}`, async () => {
                    if (row.expected === 'success') {
                        // performance_glitch_user needs ~5.6 s to log in
                        await expect(page).toHaveURL(/\/inventory\.html/, { timeout: 15000 });
                        await expect(inventoryPage.lblTitle).toHaveText(productData.pageTitles.inventory, { timeout: 15000 });
                    } else {
                        await expect(loginPage.msgError).toHaveText(row.expectedError);
                    }
                });

                console.log(`✅ [${source}] ${row.testName ?? row.TestName} completed successfully!`);
            });
        });
    });
}
