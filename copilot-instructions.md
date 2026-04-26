Copilot / Repository instruction

Use repository flow-control-syntax in Angular templates instead of structural directives.

- Use: @for (let item of items) { ... } and @if (condition) { ... }
- Avoid: *ngFor, *ngIf

Rationale: the project standard uses the flow-control-syntax to keep templates consistent with custom parsers and to avoid runtime template transformations. Apply this consistently in all new components and update existing templates when modifying them.