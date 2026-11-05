import dotenv from 'dotenv';

dotenv.config();

export class Helper {

    static convertPriceToNumber(price: string): number {
        return Number(price.replace(/[^0-9.]/g, ''));
    }

    static getProductDetails(): { productName: string; productQuantity: string; totalPrice: string } {
        return {
            productName: 'Sauce Labs Backpack',
            productQuantity: '1',
            totalPrice: '$29.99'
        };
    }

    static getLoginDetails(): { username: string; password: string } {
        return {
            username: 'standard_user',
            password: 'secret_sauce'
        };
    }

    static buildUrl(route: string, params: Record<string, string | number>): string {
        let url = route;
        for (const key in params) {
            url = url.replace(`{${key}}`, String(params[key]));
        }
        return url;
    }

    static getAuthHeaders(): Record<string, string> {
        return {
            Authorization: `Bearer ${process.env.GOREST_TOKEN}`,
            'Content-Type': 'application/json',
            Accept: 'application/json'
        };
    }
}
