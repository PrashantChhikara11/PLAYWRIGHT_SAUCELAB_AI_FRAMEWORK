import { faker } from '@faker-js/faker';

export class RandomDataUtil {

    // =========================
    // Basics
    // =========================
    static getFirstName(): string {
        return faker.person.firstName();
    }

    static getLastName(): string {
        return faker.person.lastName();
    }

    static getFullName(): string {
        return faker.person.fullName();
    }

    static getPostalCode(): string {
        return faker.location.zipCode();
    }

    static getUniqueEmail(): string {
        return `${Date.now()}.${faker.internet.email({ provider: 'example.com' }).toLowerCase()}`;
    }

    static getGender(): string {
        return faker.helpers.arrayElement(['male', 'female']);
    }

    static getUserStatus(): string {
        return faker.helpers.arrayElement(['active', 'inactive']);
    }

    static getTodoStatus(): string {
        return faker.helpers.arrayElement(['pending', 'completed']);
    }

    static getSentence(): string {
        return faker.lorem.sentence();
    }

    static getParagraph(): string {
        return faker.lorem.paragraph();
    }

    static getFutureDateTime(): string {
        return faker.date.future().toISOString();
    }

    // =========================
    // Web
    // =========================
    static generateCheckoutInfo(): { firstName: string; lastName: string; postalCode: string } {
        return {
            firstName: this.getFirstName(),
            lastName: this.getLastName(),
            postalCode: this.getPostalCode()
        };
    }

    // =========================
    // API Payloads
    // =========================
    static generateUserPayload(): { name: string; email: string; gender: string; status: string } {
        return {
            name: this.getFullName(),
            email: this.getUniqueEmail(),
            gender: this.getGender(),
            status: this.getUserStatus()
        };
    }

    static generateUserUpdatePayload(): { name: string; email: string; gender: string; status: string } {
        return {
            name: `Updated ${this.getFullName()}`,
            email: this.getUniqueEmail(),
            gender: this.getGender(),
            status: this.getUserStatus()
        };
    }

    static generateInvalidUserPayload(): { name: string; email: string; gender: string; status: string } {
        return {
            name: '',
            email: 'not-an-email',
            gender: '',
            status: ''
        };
    }

    static generatePostPayload(): { title: string; body: string } {
        return {
            title: this.getSentence(),
            body: this.getParagraph()
        };
    }

    static generateCommentPayload(): { name: string; email: string; body: string } {
        return {
            name: this.getFullName(),
            email: this.getUniqueEmail(),
            body: this.getParagraph()
        };
    }

    static generateTodoPayload(): { title: string; due_on: string; status: string } {
        return {
            title: this.getSentence(),
            due_on: this.getFutureDateTime(),
            status: this.getTodoStatus()
        };
    }
}
