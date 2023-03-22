## Purebundle

Automated annotate **`/*#__PURE__*/`** to call expression which in **variable declarator**,
**assignment expression**, **arguments of call expression** and other expressions as values

### Purpose

Help to annotate **`/*#__PURE__*/`** to drop dead code when uglyfiy and tree shaking

Will transform

```typescript
export const call = (s) => {
  return "call" + s;
};

export const stringA = call("a");
export const stringB = (() => call("b"))();
```

to

```typescript
export const call = (s) => {
    return "call" + s
}

export const stringA = /*#__PURE__*/call("a")
export const stringB = /*#__PURE__*/(() => call("b"))()
```

Notice:

code like below will not be pure call

```typescript
const a = setInterval(() => {
  console.log(a);
}, 1000);
```