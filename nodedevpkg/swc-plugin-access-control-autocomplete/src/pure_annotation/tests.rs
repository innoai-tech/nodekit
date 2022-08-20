use swc_core::testing_transform::test;
use swc_ecma_parser::Syntax;

use super::*;

test!(
    Syntax::default(),
    |data| pure_annotation(data.comments.clone()),
    should_annotate_prue,
    r#"
const C = (props) => null;
const Comp = __mustAllOf(putApp)((props) => null);
const Comp2 = __mustOneOf(putApp)((props) => null);
"#,
    r#"
const C = (props) => null;
const Comp = /*#__PURE__*/ __mustAllOf(putApp)((props) => null);
const Comp2 = /*#__PURE__*/ __mustOneOf(putApp)((props) => null);
"#
);
