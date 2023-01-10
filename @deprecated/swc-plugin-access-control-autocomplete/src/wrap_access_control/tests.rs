use crate::pure_annotation;
use swc_core::common::chain;
use swc_core::testing_transform::test;
use swc_ecma_parser::{EsConfig, Syntax};

use super::*;

test!(
    _jsx(),
    |data| chain!(
        wrap_access_control(Default::default()),
        pure_annotation(data.comments.clone())
    ),
    should_wrap,
    r#"
import { useRequest } from "@innoai-tech/access";

let v
export const Static = () => null;
export const AcComponent = () => {
    const put$ = useRequest(putApp);
    const put2$ = useRequest(putApp);
    const ret = useAcXX();
    return <AcOther v={ret}/>;
};

export const AcSomeX = () => {
    const put$ = useRequest(putApp);
    return <AcOther v={ret}/>;
}
"#,
    r#"
import { mustOneOfPermissions as __mustOneOf, mustAllOfPermissions as __mustAllOf } from "@innoai-tech/access";
import { useRequest } from "@innoai-tech/access";

let v
export const Static = () => null;
export const AcComponent = __mustAllOf(AcOther, putApp, useAcXX)(() => {
    const put$ = useRequest(putApp);
    const put2$ = useRequest(putApp);
    const ret = useAcXX();
    return <AcOther v={ret}/>;
});

export const AcSomeX = __mustOneOf(AcOther, putApp)(() => {
    const put$ = useRequest(putApp);
    return <AcOther v={ret}/>;
})
"#
);

fn _jsx() -> Syntax {
    Syntax::Es(EsConfig {
        jsx: true,
        ..Default::default()
    })
}
