# Real-Time Search Word

# How to set up and run your environment

## Configuration Settings

It is recommended to run on NodeJS 16.14.2.

## Installing and running clients

```
// Client installation
npm ci

// client execution
npm start

```

## Execute

Run Server - Storage Link ([https://github.com/walking-sunset/assignment-api_7th](https://github.com/walking-sunset/assignment-api_7th))

```
npm install
npm start

```

# Directory structure

```
📦src
│ │ ├── components
│ │ │ ├── Input
│ │ │ ├── RecommendInput
│ │ │ ├── assets
│ │ │ └── layouts
│ │ ├── lib
│ │ │ ├── api
│ │ │ ├── hooks
│ │ │ ├── styles
│ │ │ ├── utils
│ │ │ └── typings
│ │ ├── pages
│ │ │ └── Main
│ │ ├── router
└-- └── └── service

```

- Components
    
    The component folder contains components that are shared globally. It's a single page (Real SPA), but when you say you're expanding the application, you put in what you think can be shared.
    
- Pages
    
    There is a component that acts as a page.
    
- router
    
    Router components are saved.
    
- lib
    
    A library folder is a collection of http client classes, caching classes, custom hooks, styles, and more. I thought the way to organize the relevant functions here was more efficient than making hooks and interfaces scatter around other related places.
    
- service
    
    The folder where the caching, search service classes are gathered. It has a stronger independent personality than being included in the same place as the library, so I separated it separately.
    

# Implementation

## 1. Optimize API calls

- Apply debounce

```jsx
// // useDebounce
import { useEffect, useState } from "react";

function useDebounce(value: T, delay?: number): T {
const [debouncedValue, setDebouncedValue] = useState < T > value;

useEffect(() => {
const timer = setTimeout(() => setDebouncedValue(value), delay || 500);

return () => {
clearTimeout(timer);
};
}, }, [value, delay]);

return debouncedValue;
}

export default useDebounce;

// Implementation Department

debounce(func, delay);

```

## 2. Recommending search terms and moving keyboards

1. Enter a search term in the Search word window.

![https://user-images.githubusercontent.com/44064122/201107196-1cb35dcd-3603-481a-b353-77374f169554.gif](https://user-images.githubusercontent.com/44064122/201107196-1cb35dcd-3603-481a-b353-77374f169554.gif)

1. When the search term recommendation list comes up, you can navigate with the keys above and below the keyboard orientation key.

![https://user-images.githubusercontent.com/44064122/201107216-68834e46-3c28-485a-8014-842d49f9cac4.gif](https://user-images.githubusercontent.com/44064122/201107216-68834e46-3c28-485a-8014-842d49f9cac4.gif)

1. If you want to re-enter the search term, press ESC.

![https://user-images.githubusercontent.com/44064122/201107234-6ff5a4b0-7cc7-4cb6-b314-d3ef6c85a9ac.gif](https://user-images.githubusercontent.com/44064122/201107234-6ff5a4b0-7cc7-4cb6-b314-d3ef6c85a9ac.gif)

1. If you want to search while searching for a search term, press Enter. The query string then enters the URL.

![https://user-images.githubusercontent.com/44064122/201107253-eb172e2a-c81f-4552-ad2a-2f9cd81c9685.gif](https://user-images.githubusercontent.com/44064122/201107253-eb172e2a-c81f-4552-ad2a-2f9cd81c9685.gif)

## 3. Process search keyword bold

- Use regular expressions to find text that matches your search term
- When you enclose a regular expression in parentheses (), you search for returns in the entire string and save the matching text in parentheses.
- Returns the regular expression above as an array using split.
- Bold if any text matches in the array.

```jsx
export const highlightText = (
text: string,
inputValue: string
): JSX.Element => {
const regex = new RegExp(`(${inputValue})`, "gi");
return (
<>
{text.split(regex).map((word, idx) => {
return word === inputValue ? (
<span className="highlight" key={idx}>
{word}
</span>
) : (
word
);
})}
</>
);
};

```

## 4. Data Caching Method

**CacheService.ts**

```jsx
export class CacheService<K, V> {
private state;
private staleCacheTimeoutId?: NodeJS.Timeout | undefined;
private cacheTimeoutId?: NodeJS.Timeout | undefined;

constructor(
private readonly staleTime: number,
private readonly cacheTime: number
) {
this.state = new Map<K, V>();
}

setCache(key: K, value: V) {
this.state.set(key, value);
}

getCache(key: K) {
return this.state.get(key);
}

hasCache(key: K) {
return this.state.has(key);
}

deleteCache(key: K) {
return this.state.delete(key);
}

cacheTimeOut(fetch: Promise<V>, key: K) {
if (this.staleCacheTimeoutId || this.cacheTimeoutId) {
return;
}

this.staleCacheTimeoutId = setTimeout(async () => {
const response: Promise<V> = fetch;

response.then((data) => {
this.setCache(key, data);
});
}, }, this.staleTime);

this.cacheTimeoutId = setTimeout(() => {
this.deleteCache(key);
}, }, this.cacheTime);
}
}

```

- Cache data was managed by implementing a CacheService class with a Map instance.
- We set the input value of input as key value and checked the key value in Map first, and if there is no key value, data is stored in state, and if there is a key value, caching is applied by loading the data of the existing key value.
- cacheTimeout
    - The logic is to measure the staleTime time and cacheTime using the setTimeout method, refetch the data when the staleTime passes, and delete the cache data stored in the Map object after the cacheTime.
    - If the server's data is determined to be corrupted by setting the expire of the data received from the server, the server's data is fetched again, and after the cache time, the data in cache is deleted from the garbage collector in react query.
- Reasons for using Map instead of Object for data caching
    - Map performs better than Object on frequent addition and removal of key-value pairs.
    - Because all input values in the search window can be query keys, and large search data is frequently added and loaded whenever the search value changes, we decided that the Map data structure was more appropriate than the Object and stored the cache in the Map object.

## 5. Inject class dependencies

- useSearch

```jsx
const staleTime = 600000;
const cacheTime = 900000;

const api = new APIServiceImpl("<http://localhost:4000/>");
const cache = new CacheService<string, Sick[]>(staleTime, cacheTime);
const searchService = new SearchServiceImpl<Sick[]>(api, cache);

```

Creating objects outside the class and injecting objects inside the class. If one class is changed, the other class is less likely to be changed, and it is implemented to refactoring, testing, and inject dependencies across classes to increase flexibility and scalability.

- HttpClient

```jsx
import axios, { AxiosInstance } from "axios";

export abstract class HttpClient {
protected readonly instance: AxiosInstance;

constructor(protected readonly baseURL: string) {
this.instance = axios.create({
baseURL: this.baseURL
});
}
}

```

- The HttpClient class was declared abstract to prevent it from being used as an instance elsewhere.
- APIService

```jsx
export interface APIService {
fetch: (endPoint: string) => Promise<AxiosResponse<T, any>>;
}

export class APIServiceImpl extends HttpClient implements APIService {
constructor(baseURL: string) {
super(baseURL);
}

fetch = (endPoint: string) => {
console.info("calling api");
return this.instance.get < T > this.baseURL + endPoint;
};
}

```

Inherits the HttpClient, uses the instance of the HttpClient, and makes http requests.

- SearchService

```jsx
import { APIServiceImpl } from "@/lib/api/API";
import { CacheService } from "./CacheService";

interface SearchService {
search(query: string): Promise;
}

export class SearchServiceImpl implements SearchService {
protected api;
private cache;

constructor(api: APIServiceImpl, cache: CacheService<string, T>) {
this.api = api;
this.cache = cache;
}

...
}

```

Type was entered at the time of creation, not at the time of declaration, to support various types and to reduce the range of types in the created instance, type input was received as a type parameter, Generic.

- CacheService

```jsx
export class CacheService<K, V> {
private state;
private staleCacheTimeoutId?: NodeJS.Timeout | undefined;
private cacheTimeoutId?: NodeJS.Timeout | undefined;

constructor(
private readonly staleTime: number,
private readonly cacheTime: number
) {
this.state = new Map<K, V>();
}

...
}

```

CacheTime and staleTime were injected from external objects to reduce dependencies and increase flexibility.

# Troubleshooting

## 1. Direction key movement bug

- Problem with element not selected
    
    When you move the direction key, you have written the code to highlight the recommended search term by specifying index as an increase or decrease in numeric status within the key event. However, the problem was that if the initial value of state is 0, the first element of the recommended search word was not specified.
    

```jsx
// Bug code
const handleIncreaseCount = (dataLength: number) => (pre: number) => {
return pre < 0 ? 0 : pre + 1;
};

```

Perhaps the above code is simply added and subtracted, so if it is over the range, it should be branched separately. And even after the hard work of branching, normal execution was not guaranteed.

```jsx
// Resolved Code
const handleIncreaseCount = (dataLength: number) => (pre: number) => {
return pre < 0 ? 0 : (pre + 1) % dataLength;
};

```

If you divide the state of the index increase or decrease by the length of the data, the final state is returned only within that range. So I was able to solve the problem of not being able to highlight the first value.

## 2. Events occur at the same time.

When I pressed the direction key, I wanted to implement it so that I lost focus on input. However, if the blur method works, onChange occurred once more. So when I searched "Am" and pressed the arrow, it became "Am" in the search box, and all the recommended search terms disappeared. I learned that when a blur event occurs, onChange must be operated once.

So when I pressed the arrow button, I could change the code to create a state called isSelectBox to change it to a true value, and when it was true, I could change the code to stop running the handleChange function.

```jsx
const [isSelectBox, setIsSelectBox] = useState(false);

const handleChange = (e) => {
if (isSelectBox) {
return;
}
// Omit code below
};

const handleKeydownchange = (e) => {
// Code omitted
if (e.key === "ArrowUp") {
setIsSelectBox(true);
e.currentTarget.blur();
}
};

```
