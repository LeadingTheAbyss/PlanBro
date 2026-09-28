<div align="center">

<img width="550" height="500" alt="PlanBro" src="/public/large_logo_2.png" />

# PlanBro : A Unified Trip Planner

**Are you someone who struggles to keep track of a million tabs just to plan a single trip?**

I used to face this issue every time I tried to organize a trip with my friends. We had separate tabs open for IRCTC, Goibibo, MMT, MakeMyTrip, Agoda, and various Google searches just to figure out what places to visit at our destination. 

</div>


![PlanBro Overview](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/efb248bf-c40c-4be0-849f-4c31c39f7081.png)

PlanBro is a platform which helps users in three different categorical ways.

1. **If the destination is known:** If the user knows the destination that they want to travel to then they can use PlanBro to decide what all places they should visit, best options to get to the destination, what would be the best hotel options and it helps them create a seamless schedule with keeping their comfort in mind. It also helps create a final high level review using which the user can share it among other fellow travellers which is very easy to read and highly visual to pick up on with little to none effort.

2. **If the destination is not known:** If the user is looking for advices on what places they can visit, we've an option using which if the user enters the Vibe that they're looking for (eg. Mountains, Beaches, Rainy etc.) then based on that we recommend the best places that they can travel to.

3. **If you want to plan a trip with friends within your own city:** There's an option called Quick Trip using which you can plan trips within 60 seconds with your friends who live in your city and it suggests you the best route you could follow and its easy to share and follow among friends.

---

## The Motivation Behind this Project

My friends and I used to often make plans but were faced with some issues like:

- Not having an accurate estimate of the amount of money this trip would cost
- What place should we go to?
- Being unaware about the places we should travel after reaching a city.
- Comparing possible transport options and routes to reach the places and having a million tabs open looking through multiple buses, trains, flights and finding the best options and routes.
- Having unplanned clustered schedules that we were all unsure of and unable to agree upon.
- And finally, lots of miscommunication due to no concrete plan.

This was also the reason why we were continuously putting off our plans. Therefore, we decided to create a platform to solve this real world problem that we were facing, and named it as **PlanBro**.

---

## Getting Started (Running Locally)

The project is two pieces: a Next.js frontend (UI only) and a FastAPI backend (everything else — auth, Postgres, Redis, and all third-party API calls). Both need to run at the same time in development.

### Prerequisites

- Node.js 18+ and npm
- Python 3.11+
- A PostgreSQL database (this project was built against [NeonDB](https://neon.tech), but any Postgres instance works)
- An [Upstash Redis](https://upstash.com/) database (REST API, used for caching and rate limiting)

### 1. Clone and install

```bash
git clone https://github.com/LeadingTheAbyss/BrewPlans.git
cd BrewPlans
npm install
py -m pip install -r requirements.txt
```

### 2. Set up environment variables

Create a `.env` file in the project root. None of these are committed to the repo — you'll need your own values for each service:

| Variable | Used for |
| --- | --- |
| `DATABASE_URL` | Postgres connection string |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Redis caching, rate limiting |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth login |
| `NEXT_PUBLIC_GOOGLE_PLACES_KEY` | Places search, photos, distance matrix |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | Cloudflare Turnstile bot-check on quick-login/signup |
| `NEXT_PUBLIC_ADMIN_EMAILS` | Comma-separated allowlist for admin dashboard access |
| `OLA_MAPS_API_KEY` | City/place autocomplete, geocoding |
| `RAILRADAR_API_KEY` (and `RAILRADAR_API_KEY2`...`8` as a fallback pool) | Live train data |
| `SERPAPI_HOTELS_KEY` (and `SERPAPI_HOTELS_KEY2`...`4`) | Hotel search |
| `PARSE_API_KEY1`...`7` | Bus data scraping via parse.bot |
| `FLIGHTAPI_KEY` | Flight data |
| `FOURSQUARE_API_KEY` | Fallback place photos |
| `GROQ_API_KEY_1`...`9` | LLM calls for Recommend a Trip / blog Smart Fill (a pool of keys picked at random, so any subset works) |
| `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_PUBLIC_URL` | Cloudflare R2 (image/video uploads) |
| `NEXT_PUBLIC_API_URL` | Points the frontend's server-side proxy calls at the FastAPI backend (defaults to `http://127.0.0.1:8002/api` locally) |

Not every key is required to get the app running — most routes fail gracefully (empty results, a disabled feature) if a specific key is missing. `DATABASE_URL` and `UPSTASH_REDIS_REST_URL`/`TOKEN` are the ones almost everything depends on.

### 3. Run both servers

On Windows, `run.ps1` starts both at once:

```powershell
.\run.ps1
```

Or run them separately:

```bash
# Terminal 1 — backend
py -m uvicorn api:app --host 127.0.0.1 --port 8002 --reload

# Terminal 2 — frontend
npm run dev
```

Frontend: `http://localhost:3000` · Backend: `http://127.0.0.1:8002`

---

## High-Level Architecture

![High Level Architecture](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/6948bedc-ada4-4a66-885f-bd900cce806c.png)

* We were trying to build this project using free resources as much as possible and therefore it took us much more time to find the best APIs and perform some different strategies to minimize the API calls.

* We used our Redis / Database as a **cache memory** in order to avoid making repeated API calls about the same input data.

* For eg: If someone wants to find flights on 7th July from NDLS to LKO then we first check if someone has already checked for this in the past, if they've then we simply return that data instead of making an API call here, as the flight data stays the same with time.

* In case the data the user asks for isn't saved in the database, then we **first save it in the database** for future uses and then return it to the backend.

* In case someone uses functionalities like recommend a trip, or wants to find hotels closest to the places they're planning to visit, or wants a high level itinerary plan, then we've decided to use an AI model for such tasks and instead of going to the database, we prompt our model and then get back to the backend with the structured JSON response.

---

## Frontend Architecture

![Frontend Architecture](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/7898e53e-537e-4721-9aec-484ee0222828.png)

* I've tried levelling up this time from React and instead transition into Next.js for this project.

<p align="center">
  <img
    src="https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/219396d2-d7f5-47f1-8e9e-e08734de88ff.png"
    alt="Next.js"
    width="100"
  />
</p>

### Why I've used Next.js over React

1. When we visit a traditional website, the browser sends a `GET` request to the server. The server fetches any required data (such as from a database or an API), generates the complete HTML for the page, and sends it back. Since browsers can render HTML directly, the user sees the page almost immediately.

2. React, on the other hand, is typically used to build **Single Page Applications (SPAs)**. Instead of sending fully rendered HTML, the server usually returns a minimal HTML file containing an empty root element (such as `<div id="root"></div>`) along with links to the JavaScript bundle. The browser first downloads and executes this JavaScript. React then fetches any required data, builds the user interface in the browser, and finally renders the page. In other words, the browser constructs the initial page instead of receiving it already built from the server. Next.js fixes this by first using the server to build the page and then continuing to install Javascript later as well.

3. As this looked like a real scalable idea, the **Search Engine Optimization (SEO)** benefits of Next.js also leaned me towards using it, which means that if someone looks up related keywords to my website content on Google then there's a high chance my website might show up as one of the results.

<p align="center">
  <img
    src="https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/92d7f8a0-3b96-44ee-80ee-ff3c273ba755.png"
    alt="GSAP Animation"
  />
</p>

* I've used **GSAP / ScrollTrigger** here to implement a cool airplane 360° animation which perfectly matched the trip related background of my website.

* For a website like this, we were catering an audience of all age groups here and therefore I decided to keep the user interface **minimalistic & effective**.

![UI](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/ee366e10-421f-4d59-8966-ea63da5f401b.png)

* Tried to maximize user adaptability so they don't have a tough time navigating around the UI and everything is visibly apparent.

---

## Backend Architecture

The real tiresome work for this project undoubtedly lied in the backend.

### One backend, not two

Earlier versions of this project split backend logic across two runtimes: Next.js API routes (auth, sessions, trips, blogs, admin — anything touching Postgres directly) and a separate FastAPI service (transport/places/food/hotels/routing, the stuff with heavier compute). That split existed mostly because the two pieces were built at different times, not because it needed to be that way — and maintaining logic in both a Node/Prisma world and a Python/FastAPI world at once wasn't worth the overhead for a project this size.

All backend logic has since been consolidated into a single FastAPI service (`api.py` + the `backend/` package). Next.js is now a pure frontend — `src/app/api/` doesn't exist anymore. Every `/api/*` request the browser makes still goes to the same origin (so the session cookie keeps working exactly as before), but `next.config.ts` now rewrites those paths straight through to FastAPI instead of Next.js handling them itself:

```
Browser → /api/* (same-origin) → Next.js rewrite → FastAPI (single backend, Postgres + Redis)
```

The `backend/` package holds the shared building blocks every route needs — `backend/auth.py` (session-cookie lookup), `backend/quota.py` (the per-user daily API-call limits), `backend/db.py` (the asyncpg connection pool), `backend/config.py` (env var settings) — with the actual route handlers living in `backend/routers/`.

### Flights

* **Problems:** For flights finding real time data was very tough, some of the well known available options were **Amadeus**, which closed its services recently and the other being **SerpAPI** which had a highly strict free limit.

* **Decision:** We therefore resorted to using hardcoded data provided by the Directorate General of Civil Aviation (DGCA) about the flight names and schedules. As the flight prices are dynamic, we only provide a close estimate to the actual price of the flights.

* **Flow:** Our backend first hits the **Redis** to check whether the data is present on there, if not then a **cache miss** is invoked and we move towards the database. If we fail to find the data in the database as well then our **fallback method** is to use SerpAPI to fetch the real time flight data.

* The flow followed in the image below is White → Orange → Red → Purple (if necessary).

![Flights Flow](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/33a8cf6c-cab2-4d83-b481-e30694aa932f.png)

* **Trade-Offs:** The flight prices are somewhat inaccurate and all possible flight options are not visible, our flight data is restricted to only Indigo flights.

<img width="1485" height="841" alt="image" src="https://github.com/user-attachments/assets/c2cd9bb4-8bd1-4509-adc6-3fbf61e4a790" />

### Trains

* **Problems:** For trains we wanted to display all trains on the given route, their pricing and potentially the train routes, status and seat availability as well. We tried using **RapidAPI** here but it just didn't work. The **IRCTC API** is only available if we're able to show a 1 Cr+ revenue to them for our organization. We initially tried using an [Open Source Wrapper built on Github](https://github.com/AniCrad/indian-rail-api) as well, which also failed to provide results at the standard we were expecting.

* **Decision:** After hours of research, we came across [RailRadar](https://railradar.in/), a platform which provides us a generous amount of API calls daily and stores all the important data that we were looking for.

* **Flow:** Similar to flights, the same cache logic is used here. During a fallback, we call the RailRadar API which returns us the result, then displayed over our frontend.

* The flow followed in the image below is Blue → Orange → Red → Purple (if necessary).

![Trains Flow](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/08c41b18-4fb6-4f39-a199-e3d2d362eedf.png)

* **Trade-Offs:** RailRadar doesn't provide info on the seat availability in trains, so for cases when trains don't have any available seats, we can't provide any insights.

<img width="1574" height="840" alt="image" src="https://github.com/user-attachments/assets/d7eaf93b-5b6e-48a4-9f27-e2d0de6c7ce3" />

### Buses

* **Problems:** For buses we wanted to display the price, dates, names and timings of the buses. We initially tried to write and use some scrappers from **m.redbus** and other mobile apps but they just didn't seem to come around due to the cloudflare / bot protection on websites.

* **Decision:** We later resorted to using [parse.bot](https://parse.bot/) for scrapping data off of Redbus. This works really well for us.

* **Flow:** Similar to the above methods we first go through our Redis Cache and Database, and later resort to Parse bot for fallback. Note that here we aren't limited by the API calls but we still choose to call our Redis Cache and Database first as the DB and Redis caching takes around **100 milliseconds** while making an API call takes approximately **3-10 seconds** here so in order to prioritize speed, its best suited to call the DB and Redis first.

* The flow followed in the image below is White → Orange → Red → Purple (if necessary).

![Buses Flow](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/42f37c47-ddb0-4dcd-9713-c493fa1d49fb.png)

* **Trade-Offs:** We're still dealing with some inaccuracies in terms of long trips due to parse bot not working for them sometimes.

<img width="1540" height="852" alt="image" src="https://github.com/user-attachments/assets/524959db-9f96-4594-bd3c-b41411465e46" />

### Cabs

* As for the case of cabs we've simply used backend maths to calculate per km. costs of travelling by road based on different vehicles and we bump the price a bit for surge bookings during festivals which is natural. Now to calculate the distance between two cities `X` and `Y` we can use **OSRM API** to fetch the coordinates of `X` and `Y`, then simply use the maths to calculate the pricing. The standard billable distance used in 250 kms. and the respective prices are:

- **Hatchback (Mini):** ₹12.0 / km
- **Sedan (Dzire/Etios):** ₹15.0 / km
- **SUV (Innova/Ertiga):** ₹22.0 / km

* 5% GST tax, estimated tolls and the driver allowance is included as well.

<img width="1516" height="780" alt="image" src="https://github.com/user-attachments/assets/934ac4d8-9c3c-4646-8b6c-118dc84e2cf1" />

### Hotels

* **Problems:** We wanted to display the costs of hotel rooms, costs of staying each night, check in and check out times, reviews of the hotel and the amenities provided at the hotel.

* **Decision:** APIs like OYO were not open source and free to use so we've used a strictly limited alternative called SerpAPI here.

* Why did we use SerpAPI here but not earlier? As hotels are unique per city as well and we can just use the same results for each unique city, with the 1000 free API calls offered by **SerpAPI** we could conveniently cover up to 1000 unique cities which is a high number let alone and we therefore tried to stick with this approach.

* **Flow:** We use the [Google Hotels API via SerpAPI](https://serpapi.com/google-hotels-api) and perform the same cache and database operations before making the API calls as discussed in earlier sections such as Places. Similar to the above methods we first check the database and redis cache and then resort to calling the SerpAPI for hotels in case of a cache and db miss.

* The flow followed in the image below is Blue → Orange → Red → Purple (if necessary).

![Places Flow](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/34471532-5672-464e-9bbe-e0503558aeae.png)

* **Trade-Offs:** We were unable to fetch accurate check-in and check-out time for hotels as well as the maximum number of people who can be accommodated in a room, we therefore considered 3 people being the max. We also couldn't display the room availability status and amenities provided by the hotel.

![Places Section](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/428f8003-312f-47e3-a0e3-7a9772b44eef.png)

### Places

* **Problems:** In order to help people figure out what places they could visit we provide them with some options which show the places names, their images, how long it'd take them approximately to explore that place, other places they can visit nearby along with it. But there was no highly reliable free source for this. We tried using **Wikimedia** which was good for highly popular places and provided us high quality images but it **lacked coverage for less popular places** which made it highly unreliable for our purpose. Later we tried to use **Unsplash** as well but it didn't work well.

* **Decision:** As we understood this was the core heart of our project, we explored a lot of possible options and finally realized that the most reliable option present currently is **Google Places API**. It provided us with a highly generous $200 monthly free credits balance. This was enough for us to run our operations. For each city we show users up to 30 possible places that they can visit.

* **Flow:** As the Places API limits us to search for only 20 places in 1 API call, we use 2 API calls for this. For each image fetched we use an API call and therefore 30 API calls are required for the images. This information is later stored in the databases so that they're quickly fetched directly from there instead of calling an API repeatedly for it and exhausting our resources.

* The flow followed in the image above is Blue → Orange → Red → Purple (if necessary).

![Places Flowchart](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/c5740cea-84d6-470d-a7aa-e8b4e449223f.png)

* **Trade-Offs:** We could only store data for 6-7 cities daily (considering the database is currently empty and the cities are unique) due to limited API calls limit.

![Places Design](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/5cbec3ab-8f70-4ccb-b512-9532030a2697.png)

### Itinerary

<img width="1902" height="912" alt="image" src="https://github.com/user-attachments/assets/9087e2cc-9e90-434c-b1dd-52df274c86ee" />

* We've created a page where the user can basically plan the whole itinerary that they'll follow during their visit by categorizing the tasks into each specific date.
* If the user wants to follow a plan which maximizes their comfort and smartly assigns tasks to minimize travel while not losing meaning (eg. assigning a plan to visit 10 eating places in a day or at random times) the user can use **Schedule to Maximize Comfort option**.
* **Schedule to Maximize Comfort :**
  1. Based on the age of the travellers we try to limit the amount of travel in a day.
      * For Toddlers (`Age < 6`) : Under 5 hours 
      * For Adults (`Age [7, 70]`) : Under 8 hours
      * For Elderly (`Age > 70`) : Under 6 hours
      * It also adds an additional `1.25x` time to the travel if children or elderly are travelling.
  2. **DBSCAN Spatial Clustering :** It uses DBSCAN's algorithm to group all the selected places into tight geographic clusters (using a 3 km radius) to avoid travelling zig-zag in the city and visiting places closed together to each other instead.
      Here is how a plan would look with random planning and one with DBSCAN's algo :
      
<!-- end list -->
<table align="center">
<tr>
<td>
<img src="https://github.com/user-attachments/assets/4e1e0d61-3f1c-4e99-920a-56bf0d635dc8" width="430">
</td>
<td>
<img src="https://github.com/user-attachments/assets/0e392a0e-d7f1-4b69-aa11-dc22d66afb96" width="430">
</td>
</tr>
</table>

  3. **Temporal Meal Planning :** It identifies food places and mathematically pins them into strict windows.
      * Breakfast : 7-10 am
      * Lunch : 12-2 pm
      * Dinner : 7-9 pm
  4. **Avoiding Boredom :** Visiting a similar place (eg. a museum) multiple times in a row is penalized to avoid boredom during the plan.
  5. **Too clustered schedule :** If a user has plans of about 22-24 hrs long for a time frame of 7-8 hours then instead of fitting all the plans inconveniently, it drops some plans (places with the lowest ratings first) and then its up to the user whether they wan to add them to their plan or not.

### Reviews 

<img width="1905" height="853" alt="image" src="https://github.com/user-attachments/assets/4153441b-cf1f-4846-b6b5-8e525bb9cd94" />

* The reviews page helps the user get a finalized summary of the plans they've made so far.
* It is provided so that the user can quickly walkthrough their entire plan and make sure everything is intended and easily share this summary with their fellow travellers as well.
* It also provides a highly helpful visual journey of all the days of travel planned by the user.
* The predicted price of the mode of transport and the time involved in travelling is also given in the visual journey which can be highly helpful for the user. 
---

## Database Design

<img width="1574" height="840" alt="image" src="https://github.com/user-attachments/assets/3ea33993-1749-4478-9dc8-92dd3191ecdb" />

* I've yet again used **NeonDB** here using **PostgreSQL** similar to my last project.

* The main reason I've used **NeonDB** here is simply because it provides us **Serverless Connection Pooling** which is crucial for caching.

* **NeonDB** also helps us separate compute from storage, meaning it can scale down to zero when we aren't using it and wakes up when the traffic surge hits.

* I was also familiar with this as I've used it in my previous projects so this was my most favourable choice out of the other options.

* All backend logic now lives in one FastAPI service, so the whole app talks to Postgres through raw `asyncpg` queries (a connection pool in `backend/db.py`) rather than an ORM. The schema itself is still documented in `prisma/schema.prisma` (kept purely as a readable reference of table/column shapes — nothing runs `prisma migrate` against it anymore).

* The flow followed in the image below is White, Orange, Red, Green, Purple. (Note: this diagram predates the move off Prisma — the caching/fallback flow it shows is unchanged, only the DB client swapped from Prisma Client to `asyncpg`.)

![Prisma Workflow](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/67b7a96b-812e-44ec-95c9-afaeee642755.png)

### The ER Diagram

* Inorder to limit abuse of our limited resources, we keep track of how many times each API call has been called by a user.

* While entering the passenger information, people have an option to save a passenger to avoid repeatedly entering their data again and again, so we've a separate table for that as well.

![ER Diagram](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/508ed0af-cfc4-4f1d-9934-a5c9be83a545.svg)

---

## Authentication & Authorization

* In order to have only verified users, we've added a mandatory Google login before using our provided resources on the website.

**JWT via Google OAuth:** For user login I've used **Google OAuth** as its the simplest to use from a user's perspective.

![Auth Flow](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/c1a6fe3d-e621-41ce-b79e-60627eae1aa9.png)

* After the user once logs in using their account, our backend first communicates back to the database and checks whether the user already exists, if they don't then we create a new record for them.

* Instead of returning the raw **JSON Web Token (JWT)** to the user we return a secure random **Universally Unique Identifier (UUID)** string which can also be referred to as the `sessionToken`.

* What this token basically does is that, instead of keeping you logged in forever, it automatically logs you out after every 30 days from your session.

* The term coined for such an approach is known as **Stateful Database Tokens (Opaque Tokens)**, the method I've used in my earlier projects by simply returning the JWT is known as **Stateless JWTs**.

* The main advantage of using this approach is that if we use a Stateless JWT for instance then our server doesn't keep a track of the JWT so in cases where a hacker gets an access of the JWT, they can simply log into the account of the user and mess with their personal info until the JWT doesn't expire and we can't perform any server side operations to stop them.

* While for Stateful Database Tokens, if we detect a hacked account, we can simply remove their **session table**, as soon as we do this their token is completely useless and the hacker has been locked out of the ID.

* Another reason to not use raw JWT is that it contains the user's personal info such as their name, email ID, etc. while the UUID we assign each user using the above approach called Opaque tokens sound like gibberish (For eg: `550e8400-e29b-41d4-a716-446655440000`) and no personal info can come out of it.

* Using raw JWTs might be slightly faster but I feel using Stateful Database Tokens is the better approach here to prioritize Security, Control and Privacy.

* Finally the backend sets an HTTP-only secure cookie named `brewplans_session` which contains that UUID and sends it to the browser.

![Session Cookie](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/8a41c2b5-684d-4891-96f9-52473a511595.png)

---

## Recommend A Trip / LLM Integration

![LLM Integration](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/0de4a250-2357-4bdb-b581-2b2acb9e2765.png)

* For the feature **Recommend a Trip** we've integrated a Large Language Model (LLM). The LLM basically looks at the filters and preferences entered by the user and goes through its pretrained data to find the best matches for the user.

![LLM Filters](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/af60f3a0-d1b5-4748-ab35-bfcd54ceb5b0.png)

* The model we've used here is one from [Groq](https://groq.com/) called **Llama 4 Scout**. We preferred this particular model as it has about **17 billion parameters * 16 experts** and the larger the model, the better it would be at reasoning and performing high quality results, a model too small would just provide us low quality results. While in case we use a model too large (eg. having 120B parameters) it would reason for a long time and provide us higher quality results but the Speed and Quality trade-off didn't seem worth it here as the difference in quality was not quite apparent.

| Model | Parameters | Pros | Cons |
| --- | --- | --- | --- |
| Qwen3-32B | 32B | Excellent reasoning, handles multiple constraints, best balance of speed and quality | Slightly slower than smaller models |
| Llama 3.3 70B | 70B | Very high-quality responses, strong language understanding | Higher latency, more expensive inference |
| GPT OSS 120B | 120B | Extremely strong reasoning and complex planning | Overkill for simple recommendations, slower |
| GPT OSS 20B | 20B | Very fast responses, good for real-time applications | Less capable with complex constraints |
| Llama 4 Scout | 17B active parameters (MoE) | Fast, efficient, good quality-to-speed ratio | Less deep reasoning than larger models |


* **Note:** We'll be saving info from here in the database and redis as well.

* Travel costs are also included in the budget and for images here, as cities can't be obscure so we have simply used **Wikimedia**.

* The **budget / number of travellers** is asked here to avoid cases where a user is far from some place `X` and just reaching that place would cost them all their budget, such recommendations would be of no use.

* Another option we added called **International Lookalikes** is a quite fancy option we came up with which would help users travel less popularly known places in India where they could feel an experience closer to the foreign country.

* Finally a helpful **specific constraints** option is added so the user can add any specific things they'd prefer / avoid at the place of visit (eg. Overcrowding, Good food, Greenery, etc.).

* These are the results for when I searched `a place with mountains which looks like Norway and doesn't have overcrowding`.

![Recommend a Trip Results 1](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/69402940-9d69-43ad-ae6a-905b164270e3.png)

![Recommend a Trip Results 2](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/f3822ed7-db75-4124-a37a-2b469986bc8b.png)

---

## State Management

* For state management in the frontend we've used **Zustand** here.

* **State:** Its the data that represents the current condition of your application and can change over time. (eg. when you turn on dark mode, the state of `Light_Mode` turns to `false` and it turns `true` when we turn off dark mode).

* To avoid cases of having to inform each component individually the current state of our website (this issue is known as **prop-drilling**) we use Zustand to globally manage the state.

![State Management](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/a5088b54-8030-412c-a383-494fa882a987.png)

* Its a lightweight, unopinionated (allows us to freely structure) state management library. It allows components to select only the specific state they need.

---

## Rate Limiting / Throttling

* **Rate Limiting:** Its a technique used to control the number of requests which can be sent within a limited time period.

* To prevent users from spamming requests to our APIs which have limited calls we add a mandatory login along with a daily quota for each unique account.

* This is tracked per-user in Postgres (`User.apiCalls` and a handful of per-category counters) and we've an admin accessed endpoint using which we make sure users don't ill-use the given resources.

![Rate Limiting 1](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/70566f8e-ebec-4276-ab4b-a94e1101d659.png)

![Rate Limiting 2](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/4be0d994-1b3d-4a6f-a920-bd08a8eae685.png)

---

## Security

![Security](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/70fcde01-97cb-4937-b2d0-5adb91c9f43f.png)

* **XSS (Cross-Site Scripting):** This happens when a user tries to inject JavaScript into our website, which causes it to execute in another user's browser.

* Eg: If someone posts this:
`<script> fetch("/api/delete-account", {method: "POST"}); </script>`

* It would send a request to delete the account of the user whoever views this post.

* It happens when the input given by user is interpreted as JS or HTML by the browser instead of plain text.

* **Environment Variables:** We use a `.env` file to store all our API keys securely without exposing them for public use and avoiding foreign use.

* **CORS Configuration:** It basically tells the backend what all domains are allowed to make requests to it so that we don't receive requests from some unknown origin. Since the browser never talks to the FastAPI backend cross-origin (Next.js rewrites keep every `/api/*` call same-origin, so the session cookie works without CORS involved at all), this is mostly a non-issue for browser traffic — the backend's CORS policy is currently permissive (`allow_origins=["*"]`), which is worth tightening before relying on it as a security boundary.

---

## Scalability

* Most of the components of this platform have been individually compiled so scalability wouldn't affect the website as a whole.

* The main issue we would face is `Error 401` due to the **low API call limits** we have.

* As the backend is stateless, we'd use a load balancer to split the traffic from one server into multiple servers uniformly.

![Scalability](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/a82f06e1-b300-4474-8570-4231c9798f55.png)

* If the user count is highly increased then the cases of **redis calls would peak** as well due to the data having a higher probability to have searched for before.

* With a high user count we'd need to expand our database size as well to store all the names and image links for places, hotels, transport, etc.

---

## Error Handling

* For flights, trains, buses in a case of no available results an empty array is returned and a message is sent to the frontend that No options are available.

![Error Handling](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/086d9b3c-e2d8-4f9d-a692-6f1e627b59ec.png)

* We use the redis and database as the cache memory here and in case of a fail we fallback to API calls.

---

## Testing

* The testing process was highly thorough, let's go through some phases of it.

* **Authentication Testing:** We tested all the end points to make sure that authentication is required for accessing all parts of the website or our resources. We firstly figured it out that authentication was mandatory for routes like `/plan` but for `/plan/...` routes were accessible to users without logging in as well.

![Auth Testing](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/d9fd4750-ca9a-42e6-bd26-f2832a6be927.png)

* **Cache Testing:** The cache logic used by us was tested by making a forced API call and then repeating the same inputs to check whether that data is fetched from the cache or is the API call being repeated instead.

* We hadn't tested for Mumbai earlier so I first added it into the destination and got this output in the terminal due to an API call made:

![Cache Miss](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/f72efa0f-7925-4772-9ab1-f0ada081c516.png)

* Later on choosing the same destination we observe a cache hit:

![Cache Hit](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/93a721f3-89c6-49c7-bf9b-f966f4d7082a.png)

* **Browser Testing:** We made sure the platform was working on all the highly used browsers such as Chrome, Brave, Edge, Opera and Firefox.

![Browser Testing](https://cdn.hashnode.com/uploads/covers/69f3be97909e64ad072b030d/5d8aaa18-c827-4da4-a49d-270c5bbb0cf9.png)

* **Functional + API Testing:** Made sure all the API calls were in process and the features of the platform as well were working as intended. This was the part which took the longest as there we faced lot of bugs often.

---

## Deployment

* The platform has been deployed using Vercel and Render like my previous project. I've hosted my frontend (Next.js, now UI-only) using Vercel and the single consolidated FastAPI backend using Render.

* Since the frontend no longer runs any of its own API logic, Vercel's role is now purely serving the Next.js app and forwarding `/api/*` requests on to Render via the rewrite config — it doesn't touch Postgres, Redis, or any third-party API directly anymore.

---

## Challenges Faced

* The main challenge faced throughout this project was to find suitable APIs for the data we required. Due to our cost and budget restrictions we resorted to somewhat lower quality resources, but we're hoping to fix this later (discussed in next section).

---

## Future Improvements

- After some constant traffic on our website, we're hoping to use better APIs for providing more reliable high quality results.
- We'll also try to find some wrap around method to minimize the time to display data on the website when we get to it, some of the methods used currently are turning out to be somewhat slow.
- Increasing the database size is definitely one of the other options we'll be looking into later as we get more users and requests.
- If provided with the appropriate APIs and services, we might try to reach out to particular organizations regarding our project's idea in order to use their resources and benefit them indirectly through our website as well.
