import bcrypt from "bcrypt";
import mongoose from "mongoose";

const BCRYPT_ROUNDS = 12;

export interface SafeCustomer {
  _id: mongoose.Types.ObjectId;
  fullName: string;
  email: string;
  phone: string;
}

export interface Customer {
  fullName: string;
  email: string;
  password: string;
  phone: string;
  createdAt: Date;
  wishlist: mongoose.Types.ObjectId[];
}

export interface CustomerMethods {
  toSafeJSON(): SafeCustomer;
}

export type CustomerDocument = mongoose.HydratedDocument<Customer, CustomerMethods>;
export type CustomerModel = mongoose.Model<Customer, {}, CustomerMethods>;

const customerSchema = new mongoose.Schema<Customer, CustomerModel, CustomerMethods>(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      // Queries omit the hash unless they explicitly request it with select("+password").
      select: false,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    wishlist: {
      type: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
      default: [],
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    versionKey: false,
  },
);

// Only expose these fields in responses, even when the document includes a password hash.
customerSchema.methods.toSafeJSON = function toSafeJSON(this: CustomerDocument) {
  return {
    _id: this._id,
    fullName: this.fullName,
    email: this.email,
    phone: this.phone,
  };
};

// Runs for document creation and save(), so controllers do not hash passwords themselves.
customerSchema.pre("save", async function hashPassword(this: CustomerDocument) {
  // Saving unrelated changes must not hash an already-hashed password again.
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, BCRYPT_ROUNDS);
});

const Customer = mongoose.model<Customer, CustomerModel>("Customer", customerSchema);

export default Customer;
