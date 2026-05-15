export class ForbiddenError extends Error {
  constructor(message: string = "Forbidden") {
    super(message);
    this.name = "ForbiddenError";
  }
}

export class NotFoundError extends Error {
  constructor(message: string = "Not found") {
    super(message);
    this.name = "NotFoundError";
  }
}

export class InsufficientStockError extends Error {
  constructor(message: string = "Insufficient stock") {
    super(message);
    this.name = "InsufficientStockError";
  }
}

export class InvalidQuantityError extends Error {
  constructor(message: string = "Invalid quantity") {
    super(message);
    this.name = "InvalidQuantityError";
  }
}
