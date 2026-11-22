import { ValidatorFn } from '@angular/forms';
export const strong: ValidatorFn = (c) => (/^(?=.*[A-Z])(?=.*\d).{8,}$/.test(c.value || '') ? null : { weak: true });
