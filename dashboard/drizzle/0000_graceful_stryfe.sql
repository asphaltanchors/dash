-- Current sql file was generated after introspecting the database
-- If you want to run this migration please uncomment this code before executing migrations
/*
CREATE SCHEMA "analytics_mart";
--> statement-breakpoint
CREATE TABLE "analytics_mart"."fct_products" (
	"quick_books_internal_id" varchar,
	"item_name" varchar,
	"sales_description" varchar,
	"product_family" text,
	"material_type" text,
	"is_kit" boolean,
	"item_type" varchar,
	"item_subtype" varchar,
	"purchase_description" varchar,
	"sales_price" text,
	"purchase_cost" text,
	"manufacturer_s_part_number" varchar,
	"unit_of_measure" varchar,
	"load_date" varchar,
	"snapshot_date" varchar
);
--> statement-breakpoint
CREATE TABLE "analytics_mart"."fct_orders" (
	"order_number" varchar,
	"source_type" text,
	"order_date" date,
	"customer" text,
	"payment_method" text,
	"status" text,
	"due_date" date,
	"is_tax_exempt" boolean,
	"is_paid" boolean,
	"is_backdated" boolean,
	"billing_address" text,
	"billing_address_city" text,
	"billing_address_state" text,
	"billing_address_postal_code" text,
	"billing_address_country" text,
	"shipping_address" text,
	"shipping_address_city" text,
	"shipping_address_state" text,
	"shipping_address_postal_code" text,
	"shipping_address_country" text,
	"shipping_method" text,
	"ship_date" date,
	"memo" text,
	"message_to_customer" text,
	"class" text,
	"currency" text,
	"exchange_rate" numeric,
	"terms" text,
	"sales_rep" text,
	"transaction_id" text,
	"quickbooks_internal_id" text,
	"external_id" text,
	"created_date" timestamp,
	"modified_date" timestamp,
	"total_line_items_amount" numeric,
	"total_tax" numeric,
	"total_amount" numeric,
	"item_count" bigint,
	"effective_tax_rate" numeric
);

*/