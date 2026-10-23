# ChargeShare

> **Airbnb for EV chargers in India**

ChargeShare is a peer-to-peer EV charging platform that helps electric vehicle owners find and book nearby private chargers while enabling homeowners to earn income from chargers that would otherwise sit idle.

## The problem

EV adoption is growing in India, but charging infrastructure is still unevenly distributed. An EV owner may have very little battery remaining while the nearest public charging station is several kilometres away.

At the same time, thousands of private residential chargers are underused for most of the day. ChargeShare connects these two groups and turns existing residential charging capacity into a trusted local network.

## The solution

ChargeShare enables:

- **EV drivers** to discover, book, and pay for verified nearby chargers.
- **Hosts** to list available chargers, define charging slots, and earn passive income.
- **The platform** to manage identity verification, safety information, ratings, payments, and commission collection.

## How it works

1. A host lists a charger with its location, connector type, charging speed, availability, price, and safety details.
2. ChargeShare verifies the host and charger information.
3. A driver searches the live map for nearby available chargers.
4. The driver selects a time slot and pays through the platform.
5. The driver visits the location and charges their vehicle.
6. Both participants rate the experience.
7. The host receives the payout after the platform commission is deducted.

## Core features

### For EV drivers

- Live map of nearby available chargers
- Charger search and filtering by distance, connector, speed, price, and rating
- Real-time availability and slot booking
- Secure online payments
- Booking history and receipts
- Host and charger ratings
- Basic charging and safety guidance

### For charger hosts

- Host profile and identity verification
- Charger listing and verification workflow
- Availability calendar and slot management
- Pricing configuration
- Booking and earnings dashboard
- Payout tracking
- Guest ratings and reviews

### For the platform

- User and host verification
- Charger approval and safety checks
- Booking lifecycle management
- Payment collection and commission handling
- Dispute and cancellation management
- Ratings and review moderation
- Insurance and liability workflow support

## MVP scope

The first release should focus on validating the local supply-and-demand loop:

- User registration and authentication
- Host onboarding
- Charger listing creation
- Charger discovery on a map
- Availability and slot booking
- Payment integration
- Booking confirmation and history
- Ratings and reviews
- Basic admin review of users, chargers, and bookings

The MVP should initially target a limited number of urban neighbourhoods rather than attempting nationwide coverage.

## Important considerations

### Charging speed

Many residential chargers are slow AC chargers and may require 14–15 hours for a full charge. Listings should clearly display charging speed and expected charging time so drivers can choose chargers based on their needs.

### Electrical safety

Every listing should include basic safety requirements, such as:

- Correct connector and vehicle compatibility
- Proper earthing and electrical installation
- Safe parking and cable routing
- Weather protection where applicable
- Clear emergency contact instructions

ChargeShare should define a charger verification checklist and require hosts to confirm that their installation complies with applicable local requirements.

### Liability and insurance

The platform should establish clear policies for:

- Damage to vehicles or charging equipment
- Electrical incidents
- Unsafe host or guest behaviour
- Cancellations and no-shows
- Refunds and disputes

Insurance coverage and legal requirements should be reviewed with qualified local professionals before launch.

### Privacy and location safety

Exact residential addresses should not be exposed unnecessarily. The platform should consider approximate map locations before booking and reveal precise access instructions only after a booking is confirmed.

## Business model

ChargeShare can generate revenue by taking a commission from each completed booking.

Potential future revenue streams include:

- Premium host tools
- Subscription plans for frequent drivers
- Apartment and housing-society partnerships
- Fleet and corporate charging plans
- Charger installation and maintenance partnerships
- Insurance and roadside assistance partnerships

## Target users

- Urban EV owners aged 18–35
- Homeowners with idle EV chargers
- Apartment complexes and housing societies
- EV fleets and businesses
- Local electricians and charger installation partners

## Why now?

Building new public DC fast-charging infrastructure is capital-intensive and time-consuming. ChargeShare uses charging equipment that already exists in homes and communities, increasing access without requiring new large-scale infrastructure at every location.

The model is inspired by peer-to-peer charging platforms such as CoCharger in the UK, adapted for Indian cities, residential communities, and charging behaviour.

## Suggested product principles

- **Trust first:** verify users, hosts, chargers, and reviews.
- **Be transparent:** show charging speed, price, availability, and expected duration clearly.
- **Protect both sides:** provide clear cancellation, damage, dispute, and safety policies.
- **Start locally:** build density in a small number of neighbourhoods before expanding.
- **Design for reliability:** make booking and payment status unambiguous.
- **Respect privacy:** protect residential addresses and personal information.

## Roadmap

### Phase 1 — Validate the marketplace

- Launch in one or two target cities
- Onboard a small set of verified hosts
- Support charger discovery, booking, and payments
- Measure booking completion, repeat usage, and host activation

### Phase 2 — Improve trust and operations

- Add stronger identity and charger verification
- Introduce safety checklists and incident reporting
- Add cancellation, refund, and dispute workflows
- Build host payouts and operational dashboards

### Phase 3 — Expand the network

- Partner with apartment complexes and housing societies
- Add fleet and business accounts
- Support more charger types and connector standards
- Introduce subscriptions and loyalty features

## Success metrics

- Number of verified active chargers
- Percentage of charger listings with available slots
- Search-to-booking conversion rate
- Booking completion rate
- Average host earnings
- Repeat booking rate
- Average driver and host rating
- Cancellation and dispute rate
- Average time to resolve incidents

## Project status

🚧 **Early concept / pre-MVP**

This repository is being set up for the initial ChargeShare product exploration and MVP development.

## Getting started

Implementation details will be added as the technology stack is selected.

Planned documentation will cover:

- Local development setup
- Environment variables
- Database setup and migrations
- Payment provider configuration
- Map provider configuration
- Running tests
- Deployment

## Contributing

Contributions, feedback, and ideas are welcome. Before opening a pull request:

1. Create an issue describing the proposed change.
2. Keep changes focused and document important product or technical decisions.
3. Add or update tests where applicable.
4. Update the relevant documentation.

## License

The project license has not been selected yet.

