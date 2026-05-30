import { generateRaySoImage } from "./utils/generateRaySoImage";

const sampleCode = `import { useCallback } from "react";

export default function ProductPage({ productId, referrer })
{
  const handleSubmit = useCallback(
    (orderDetails) => {
      post("/product/" + productId + "/buy", { referrer,
orderDetails });
    },
    [productId, referrer],
  );

  return <ShippingForm onSubmit={handleSubmit} />;
}`;

async function test() {
  try {
    const path = await generateRaySoImage(sampleCode);
    console.log("✅ Success! Image saved to:", path);
  } catch (error) {
    console.error("❌ Failed:", error);
  }
}

test();
