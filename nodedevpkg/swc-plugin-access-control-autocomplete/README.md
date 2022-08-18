## @innoai-tech/swc-plugin-access-control-autocomplete

Autocomplete AccessControl React HoC.

but it will be boring and easy to make mistake.

with this plugin we could use special named component (`Ac(Every)Component` and `AcSomeComponet`) to autocomplete
the `AccessControlComponent`.

the key of access control should be from request method, we could collect them by `use(\w+)?Request` or `useAc(\w+)`.
and `AccessControlComponent` will be composed too.

```typescript jsx
export const AcComponent = () => {
    const [] = useRequest(putApp, {});

    return <AcComponent2/>;
};
```

will be transform to

```typescript jsx
export const AcComponent = mustAllOfPermissions(
    AcComponent2,
    putApp,
)(() => {
    const [] = useRequest(putApp, {});

    return <AcComponent2/>;
});
```
