export type BlogPost = {
  slug: string;
  title: string;
  description: string;
  category: string;
  publishedAt: string;
  readingTime: string;
  excerpt: string;
  content: string;
};

export const blogPosts: BlogPost[] = [
  {
    slug: "shopify-product-page-cro",
    title: "Shopify product page CRO: the fundamentals that move the needle",
    description:
      "A practical, evidence-led guide to improving a Shopify product page: clarity, buying decisions, variant UX, confidence, and a 30-minute review.",
    category: "Product page",
    publishedAt: "2026-10-22",
    readingTime: "9 min read",
    excerpt:
      "Most product-page improvements are not clever hacks. They remove uncertainty from a shopper who is already interested. Here is where to look first.",
    content: `Conversion rate optimization is often presented as a collection of tricks: countdown timers, urgency badges, pop-ups, and a new button colour every quarter. In practice, a product page converts when an interested shopper can answer a small set of questions quickly and confidently.

That is especially true on Shopify, where the product template carries a lot of responsibility. It has to explain the product, present choices, communicate price and delivery, reduce risk, and get out of the way of the add-to-cart decision.

This guide covers the fundamentals worth reviewing before you test cosmetic changes. It is not a list of universal winners. It is a practical way to find friction and decide what to fix next.

## Start with the first screen

The first screen of a product page should answer four questions without requiring a scroll:

- What exactly is this product?
- Who is it for or what problem does it solve?
- How much does it cost?
- What is the next step?

A clear product name in the H1, a useful primary image, an accurate price, and a visible add-to-cart control do most of that work. Supporting details can follow. If the first screen is dominated by a large promotional banner, a delayed image, or a vague headline, the shopper has to work to understand the offer.

Ask someone unfamiliar with the store to look at the page for five seconds. Then ask them what is being sold and what they would do next. Their answer is more useful than a debate about button styling.

## Make the choice easy, not busy

A product page often asks the shopper to make several decisions at once: size, colour, quantity, bundle, subscription, shipping option, and whether to add a protection plan. Each choice can be legitimate. The problem is when the choices are presented without hierarchy.

A useful pattern is to keep the primary path obvious:

- Show the selected variant clearly, not just inside a dropdown.
- Put the add-to-cart action next to the price and the current selection.
- Keep secondary actions visually quieter than the main action.
- Explain sold-out, pre-order, or back-in-stock states in plain language.
- Provide a size guide or comparison where the decision needs one.

If a variant is unavailable, say so before the shopper clicks add to cart. A disabled button with no explanation creates doubt. A short message such as “Medium is currently unavailable; restock expected in November” is more useful than a silent failure.

The same principle applies to bundles and subscriptions. If the shopper cannot tell what is included or how often they will be charged, the safest response is usually to leave rather than guess.

## Put reassurance next to the doubt

Trust content is not a separate section at the bottom of the page. It should appear where a question is likely to arise.

For many stores, that means shipping and returns information near the buy button, not buried in a footer menu. A short line can be enough: “Free UK delivery over £50 · 30-day returns.” The full policy can remain a link. The shopper needs to know the important terms now, not after starting checkout.

Reviews can help, but only if they are specific and credible. A row of five stars with no context is weaker than a few detailed comments that mention fit, delivery, or how the product is used. Do not invent reviews, hide negative themes, or use a generic “trusted by thousands” claim without evidence.

Payment icons and security badges can be relevant, but they do not replace clear policies. A shopper is more likely to be stopped by an unclear returns window than by the absence of a padlock illustration.

## Reduce form and state friction

Small interface states have an outsized effect because they occur at the moment of commitment.

Review what happens when the shopper:

- selects a variant
- changes quantity
- clicks add to cart with a required option missing
- applies a discount code
- encounters an out-of-stock item
- gets a cart or network error

Error messages should say what happened and what to do next. “Please select a size” is useful. “Something went wrong” is not. The selected state of a swatch should be obvious without relying on colour alone. Quantity controls should be large enough to tap and should not reset unexpectedly.

If you use a cart drawer, make sure it clearly confirms the item, quantity, price, and the route to checkout. A drawer that opens over the page without a clear next step can feel like an interruption rather than progress.

## Use evidence before changing the design

A product-page change is a hypothesis. Analytics can show where people leave. Session recordings can show repeated hesitation or rage clicks. Customer support can reveal the questions shoppers ask before buying. Search terms on the site can show the language customers use.

Combine those signals with a manual review. If many shoppers abandon after opening the size guide, investigate the guide itself. If they repeatedly click an unavailable size, the availability state may be unclear. If support keeps answering the same shipping question, the page is not doing its job.

Then make one meaningful change and give it enough time to produce a useful signal. Testing a new button colour while also rewriting the description and changing the shipping threshold tells you very little. Prioritise the change that addresses the clearest uncertainty.

## A 30-minute product-page review

Use this as a starting point, not a scorecard:

1. Read the H1 and first paragraph aloud. Is the product and its purpose obvious?
2. Check the price, variant state, and add-to-cart control on a narrow screen.
3. Try every variant. Look for unclear availability or selection states.
4. Read the shipping and returns summary as a first-time shopper.
5. Check whether the primary image and product gallery explain the item.
6. Look for competing calls to action near the buy button.
7. Submit the form with a required option missing and read the error.
8. Confirm the cart state after adding a product.
9. Ask someone unfamiliar with the store to explain the offer after five seconds.
10. Compare the page with the top three questions your support team receives.

Do this on a real phone as well as a desktop browser. A page can look polished in a screenshot and still be frustrating to use with a thumb.

## Where a static audit fits

A static HTML audit can verify some useful signals: whether a page has a title and H1, how its mobile viewport is declared, whether images have alt attributes, whether Product structured data is present, and whether a standard add-to-cart control appears in the initial HTML.

It cannot tell you whether the page feels trustworthy, whether a variant picker is easy to use, or whether a shopper will complete checkout. Those require a rendered page, real interactions, and human judgment. Our [free Shopify audit](/audit) labels those limits clearly rather than filling the gap with invented findings.

Start with clarity, remove the most consequential uncertainty, and measure the result. That is less exciting than a growth hack, but it is a more reliable way to improve a Shopify product page. For the next area, read our guide to [mobile UX problems that hurt conversions](/blog/mobile-ux-shopify-conversions) and [trust signals at checkout](/blog/trust-signals-checkout).`,
  },
  {
    slug: "mobile-ux-shopify-conversions",
    title: "Mobile UX problems that can quietly reduce Shopify conversions",
    description:
      "A practical mobile UX checklist for Shopify stores: thumb reach, tap targets, sticky bars, variant selectors, forms, media, and the handoff to checkout.",
    category: "Mobile UX",
    publishedAt: "2026-10-14",
    readingTime: "8 min read",
    excerpt:
      "Mobile problems rarely announce themselves. They show up as hesitation, accidental taps, and abandoned carts. Here is how to find them.",
    content: `Mobile usability rarely fails in one dramatic moment. It fails in small ones: a menu that covers the buy button, a variant selector that is hard to tap, an input that zooms the page, or a shipping cost that appears only at checkout.

Because these problems are distributed across a real device and a real network, they are easy to miss during a desktop review. A static HTML audit can catch a missing responsive viewport or image-alt gaps, but it cannot feel the page. You need to use it.

This checklist focuses on the friction that commonly appears on Shopify product pages. It is not a claim that every store has every problem. Use it to test your own experience.

## Start with the thumb, not the mouse

On a phone, the bottom half of the screen is easier to reach than the top corners. The primary action should not require a stretch, especially after the shopper has scrolled through product information.

Check the add-to-cart control at the point where it appears:

- Is it visible without pinching or horizontal scrolling?
- Is it large enough to tap without hitting a neighbouring link?
- Does a sticky bar cover product details or the footer?
- Does the sticky bar duplicate another add-to-cart button in a confusing way?
- Does opening the menu, chat, or cookie banner hide the action?

Sticky add-to-cart bars can be useful on long product pages, but they need to be tested with the store’s real apps. Cookie banners, currency selectors, chat widgets, and upsell pop-ups can all compete for the same space. Stack them on a narrow screen and the “simple” path can become crowded.

## Give tap targets room to breathe

Small links and tightly packed controls are common failures. A shopper trying to select a size should not hit “size guide” instead. A shopper closing a review carousel should not accidentally open a product image.

A good practical test is to use the page with your thumb while standing or holding something in your other hand. If you repeatedly miss the intended control, it is not a user error. Improve spacing, increase the interactive area, and make the selected state obvious through more than colour.

This matters for:

- variant swatches and size buttons
- quantity controls
- gallery arrows and thumbnails
- accordion headers
- close buttons on modals and drawers
- “add to cart” and “buy now” controls
- links to shipping, returns, and support

## Make variant selection understandable

Dropdowns save space, but they can hide the state of the product. Swatches are more visual, but they can become cramped and ambiguous when there are many options.

Whatever pattern you use, a shopper should be able to tell:

- which variant is currently selected
- which variants are unavailable
- what changed after they selected a new option
- whether the price or image changed

When a combination is unavailable, explain it immediately. Do not wait until the shopper taps add to cart. Use text as well as colour to communicate selected and unavailable states. If a variant is only available for pre-order, state the expected timing near the action.

## Stop forms from fighting the browser

Mobile form problems can make a page feel broken. Inputs with text smaller than 16px may cause browsers to zoom when focused. A field that opens the wrong keyboard adds unnecessary work. Error messages that appear far from the field are easy to miss.

Test the forms on the product page and in the cart:

- Can the shopper type comfortably without the layout jumping?
- Does each input have a visible label, not just a placeholder?
- Are errors announced and placed next to the relevant field?
- Does the keyboard cover the submit button?
- Are quantity and discount fields free of accidental scroll changes?

For email capture and checkout forms, avoid asking for information that is not needed at that step. Every additional field is another chance to lose the shopper.

## Treat media as part of the interface

Product images and video are not just decoration. On mobile, they are how the shopper inspects the item. A gallery that is difficult to swipe, images that load slowly without a useful placeholder, or a zoom interaction that traps the page all create friction.

Review whether:

- the first image loads promptly on a throttled connection
- image dimensions are stable while loading, so the page does not jump
- the gallery has a clear indication that more images exist
- video does not autoplay with sound or block the page
- alt text is meaningful for shoppers using assistive technology

A page does not need every media feature. It needs a reliable way to understand the product. A large image that never finishes loading is worse than a smaller, clear one that does.

## Do not hide essential information in accordions

Accordions are useful for detailed specifications and long policy text. They are a poor place for the one fact that decides whether a shopper buys, such as delivery time, return window, or a material that affects fit.

Put the decision-critical summary on the page and use the accordion for the full explanation. If the shopper has to open three sections to discover a restocking fee or a long dispatch delay, the design is creating uncertainty rather than reducing clutter.

The same rule applies to store policies in menus. A footer link is not a substitute for a short, clear summary near the buying action.

## Watch the handoff to cart and checkout

Mobile abandonment often happens after a successful add to cart. The shopper has decided to buy, then meets an unclear drawer, a slow cart, an unexpected shipping estimate, or a checkout that feels like a different website.

Complete a test order on a phone, including the states before payment:

- add a product with a non-default variant
- open the cart from the header and from the drawer
- change quantity and remove the item
- enter an invalid discount code
- reach the shipping step and read the delivery estimate
- go back and confirm the cart state is preserved

Do not use a real customer’s card or personal data. Use the store’s test mode where available. The goal is to find friction, not to process a payment.

## Test under realistic conditions

A fast desktop connection and a large monitor hide problems. Use a real phone if possible. Check at least a narrow width around 360–390 pixels, then a larger phone size. Throttle the connection to see what loads first. Rotate the device. Try browser text scaling.

Keep notes with screenshots or short recordings. “The buy button is hard to use on mobile” is difficult to act on. “At 375px width, the sticky chat bubble covers the right side of the add-to-cart button after scrolling” is a fixable issue.

## A short mobile review checklist

1. Can the main task be completed with one thumb?
2. Are all key controls comfortably tappable?
3. Does any overlay cover the buy action?
4. Are variant states clear without relying on colour?
5. Do form fields avoid unwanted zoom and show useful errors?
6. Do images load without layout shifts or broken zoom behaviour?
7. Are shipping, returns, and support details discoverable?
8. Does the cart preserve the shopper’s choices?
9. Does checkout clearly explain costs and delivery?
10. Did you test on a real device, not only a desktop emulator?

A static [Shopify audit](/audit) can check the responsive viewport declaration and server-rendered image alt attributes before you begin. It cannot replace this device review, and the report says so. Continue with the [product-page CRO fundamentals](/blog/shopify-product-page-cro) and [trust signal guidance](/blog/trust-signals-checkout) for the other half of the picture.`,
  },
  {
    slug: "trust-signals-checkout",
    title: "Trust signals that make checkout feel safer",
    description:
      "How to use shipping, returns, reviews, support, and security information to reduce checkout uncertainty without relying on empty badges or fake claims.",
    category: "Trust",
    publishedAt: "2026-10-06",
    readingTime: "8 min read",
    excerpt:
      "Shoppers are not looking for a wall of badges. They are looking for specific answers to reasonable worries. Put those answers where the doubt happens.",
    content: `Trust is not a decoration you add at the end of a store. It is the absence of unanswered doubt at the moment a shopper is deciding whether to spend money.

A shopper may be interested in the product and still stop because they do not know when it will arrive, whether returns are easy, who to contact if something goes wrong, or whether the payment page is legitimate. A pile of generic trust badges does not answer those questions. Specific, visible information does.

## Trust is situational

The most important reassurance depends on the product and the shopper. For a low-cost consumable, delivery time and freshness may matter most. For apparel, fit, returns, and sizing are central. For an expensive item, warranty, support, and secure payment may carry more weight.

Start by listing the real objections your support team hears. Then look for where those objections arise on the product page and in checkout. A returns policy that exists only in the footer is technically present but practically invisible.

Trust content should be:

- specific rather than vague
- close to the decision it supports
- written in plain language
- consistent across the product page, cart, checkout, and emails
- true for the store’s actual processes

## Say what delivery really means

“Fast shipping” is less useful than “Orders placed before 2pm ship the next business day. UK delivery usually takes 2–3 working days.” The second version lets the shopper plan. It also reduces support questions.

Show the delivery summary near the buy button and the full details in the cart or a linked policy. If delivery time varies by variant, destination, or pre-order status, make that visible before checkout. Do not surprise the shopper with a long dispatch delay after they have entered payment details.

Be careful with promises you cannot keep. A countdown timer that resets on every visit, or a “ships today” message that is always shown, teaches shoppers that the store’s information is unreliable.

## Make returns feel like a plan, not a trap

A returns policy is a risk-reduction tool, but only if the shopper can understand it quickly. Answer the practical questions:

- How long does the shopper have?
- What condition must the item be in?
- Who pays return shipping?
- Are any items excluded?
- How does the shopper start a return?

Place a short summary near the product action and link to the full policy. If returns are extended for the holiday period, say so explicitly. If a product is final sale, make that clear before checkout rather than hiding it in a policy page.

Consistency matters. If the product page says 30 days, the checkout and confirmation email should not imply 14. Mismatched policies create doubt even when the shopper is not actively comparing them.

## Use reviews as evidence, not decoration

Reviews can be a strong trust signal when they contain specific experience. They can also be nearly meaningless when every review is a five-star sentence like “Great product!” published on the same day.

Look for ways to make reviews more useful:

- show recency and the number of reviews
- allow detailed comments about fit, delivery, or use
- highlight common concerns honestly
- make it easy to see how reviews are verified
- avoid hiding a meaningful pattern of complaints

Do not manufacture reviews, edit out reasonable criticism, or use stock faces as if they were customers. Shoppers are good at noticing patterns, and a false trust signal is worse than no signal at all.

If you do not have many reviews yet, that is acceptable. Replace the empty carousel with useful product detail, a clear guarantee, or a direct support route. Honest incompleteness is more credible than fabricated social proof.

## Put support where the shopper needs it

A contact page in the footer is useful for people who already trust the store. A visible support option near the buying decision helps people who are not there yet.

This does not mean a chat bubble on every screen. It means making it clear that a real person or team can help. A short line such as “Questions about fit? Email us at …” can be enough. If you offer live chat, state the hours and avoid a widget that opens with no reply for hours.

Support information also has to be accurate. A “24/7 support” claim with an unanswered inbox damages trust more than a smaller, honest promise.

## Be careful with security language

Shoppers want to know that payment is handled safely, but vague badges do not explain much. Use language you can substantiate. Shopify checkout handles payment details; the store should avoid making claims about storing card numbers or encryption that it cannot verify.

What you can do is remove ambiguity:

- make the final costs clear before payment
- use a consistent domain and checkout flow
- show a clear return and support path
- avoid unexpected upsells at the last step
- ensure error messages are specific and do not ask for sensitive information

Do not add seals or logos you are not entitled to use. A borrowed trust mark is a liability, not reassurance.

## Reduce uncertainty at checkout

Checkout is where the shopper has to commit. Any new information at this stage can feel like a hidden condition.

Review the flow for:

- unexpected shipping or tax costs
- missing delivery estimates
- unclear payment options
- account creation forced before purchase
- forms that are difficult on a phone
- errors that lose the shopper’s progress
- a support link that disappears when it is needed

If a discount code is invalid, say so clearly and let the shopper continue. If an item has become unavailable, explain the options rather than silently removing it. If a field is required, label it before the shopper submits.

Small frictions feel larger here because the shopper is close to finishing. Preserve their choices wherever possible.

## Keep the post-purchase experience consistent

Trust does not end when the order is placed. A confirmation email that matches the checkout, a dispatch notice with tracking, and a clear returns process all reinforce the decision. If the shopper has to hunt for support after paying, the store’s earlier reassurance starts to look like marketing.

Check the transactional emails and the first delivery update. They are part of the conversion experience even though they sit outside the product page.

## A practical trust review

1. List the five objections your support team hears most.
2. Find where each objection appears in the buying journey.
3. Add the shortest truthful answer near that point.
4. Check that shipping, returns, and support wording is consistent.
5. Review whether reviews are specific, recent, and honestly moderated.
6. Remove badges or claims you cannot substantiate.
7. Complete a test checkout on mobile and read every message.
8. Check the confirmation and dispatch emails.
9. Ask someone unfamiliar with the store what they would still worry about.
10. Fix the largest remaining uncertainty before adding more visual noise.

## What an honest audit can tell you

A static HTML audit can detect that shipping, returns, support, or security references appear in the page text. It cannot judge whether those policies are good, whether the shopper sees them at the right moment, or whether the store honours them. Our [free audit](/audit) treats that as a presence check and labels the rest as unverified.

Use the result as a prompt for a human review, not as a trust score. Pair it with the [product-page CRO fundamentals](/blog/shopify-product-page-cro) and the [mobile UX checklist](/blog/mobile-ux-shopify-conversions). The strongest trust signal is a store that answers the obvious question before the shopper has to ask it.`,
  },
];

export function getBlogPost(slug: string) {
  return blogPosts.find((post) => post.slug === slug);
}

export function getRelatedPosts(currentSlug: string, limit = 2) {
  return blogPosts
    .filter((post) => post.slug !== currentSlug)
    .slice(0, limit);
}
