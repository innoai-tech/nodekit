use swc_core::common::DUMMY_SP;
use swc_core::ecma::ast::{Expr, ExprOrSpread, Prop, Ident, IdentName, KeyValueProp, Lit, ObjectLit, Pat, PropName, VarDeclarator, PropOrSpread, ArrayLit, CallExpr};
use swc_core::ecma::visit::{as_folder, noop_visit_mut_type, Fold, VisitMut, VisitMutWith};
use convert_case::{Case, Casing};
pub fn vue_component_completer() -> impl Fold + VisitMut {
    as_folder(VueComponentCompleter {})
}

struct VueComponentCompleter {}


impl VisitMut for VueComponentCompleter {
    noop_visit_mut_type!();

    fn visit_mut_var_declarator(&mut self, expr: &mut VarDeclarator) {
        if let Pat::Ident(ref mut var) = expr.name {
            if let Some(init) = expr.init.as_mut() {
                if let Expr::Call(ref mut call_expr) = init.unwrap_parens_mut() {
                    complete_call_expr(call_expr, &*var.sym);
                }
            }
        }

        expr.visit_mut_children_with(self);
    }
}

fn complete_call_expr(call_expr: &mut CallExpr, display_name: &str) {
    if let Some(expr) = call_expr.callee.as_mut_expr() {
        if let Expr::Ident(id) = expr.as_ref() {
            if &*id.sym == "styled" || &*id.sym == "component" || &*id.sym == "component$" {
                let props = collect_props(call_expr);

                let arg = ExprOrSpread {
                    expr: create_component_options(display_name, props),
                    spread: None,
                };

                call_expr.args.append(&mut Vec::from([arg]));
            }

            return;
        }

        if let Expr::Call(ref mut call_expr_in_callee) = expr.unwrap_parens_mut() {
            complete_call_expr(call_expr_in_callee, display_name)
        }
    }
}


fn create_component_options(display_name: &str, attrs: Vec<&str>) -> Box<Expr> {
    let mut props: Vec<&str> = Vec::new();
    let mut emits: Vec<&str> = Vec::new();

    attrs.iter().for_each(|attr_name| {
        if attr_name.starts_with("on") && attr_name.chars().nth(2).unwrap().is_uppercase() {
            let emit_name = &attr_name[2..];
            emits.push(emit_name)
        } else if !attr_name.starts_with("$") {
            props.push(attr_name)
        }
    });


    let mut obj_props = Vec::from([
        PropOrSpread::Prop(prop_display_name(display_name))
    ]);


    if props.len() != 0 {
        obj_props.push(PropOrSpread::Prop(prop_props(props)))
    }

    if emits.len() != 0 {
        obj_props.push(PropOrSpread::Prop(prop_emits(emits)))
    }

    return Box::new(
        Expr::Object(
            ObjectLit {
                span: DUMMY_SP,
                props: obj_props,
            },
        ),
    );
}

fn collect_props(call_expr: &mut CallExpr) -> Vec<&str> {
    let mut props: Vec<&str> = Vec::new();

    call_expr.type_args.iter().for_each(|type_arg| {
        type_arg.params.iter().for_each(|ts_typ| {
            ts_typ.as_ts_type_lit().iter().for_each(|ts_type_lit| {
                ts_type_lit.members.iter().for_each(|ts_type_elem| {
                    ts_type_elem.as_ts_property_signature().iter().for_each(|prop| {
                        prop.key.as_ident().iter().for_each(|ident| {
                            props.push(ident.sym.as_str());
                        })
                    })
                })
            })
        })
    });

    return props;
}

fn prop_display_name(display_name: &str) -> Box<Prop> {
    return Box::new(
        Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(IdentName::from(Ident::new_no_ctxt("displayName".into(), DUMMY_SP))),
            value: Box::new(Expr::Lit(Lit::from(display_name))),
        }),
    );
}


fn prop_props(props: Vec<&str>) -> Box<Prop> {
    let elems = props
        .iter()
        .map(|v| Some(ExprOrSpread {
            spread: None,
            expr: Box::new(Expr::Lit(Lit::from(*v))),
        }))
        .collect();

    return Box::new(
        Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(IdentName::from(Ident::new_no_ctxt("props".into(), DUMMY_SP))),
            value: Box::new(Expr::Array(ArrayLit {
                span: DUMMY_SP,
                elems,
            })),
        }),
    );
}


fn prop_emits(props: Vec<&str>) -> Box<Prop> {
    let elems = props
        .iter()
        .map(|v| Some(ExprOrSpread {
            spread: None,
            expr: Box::new(Expr::Lit(Lit::from(to_emit_name(*v)))),
        }))
        .collect();

    return Box::new(
        Prop::KeyValue(KeyValueProp {
            key: PropName::Ident(IdentName::from(Ident::new_no_ctxt("emits".into(), DUMMY_SP))),
            value: Box::new(Expr::Array(ArrayLit {
                span: DUMMY_SP,
                elems,
            })),
        }),
    );
}

fn to_emit_name(s: &str) -> String {
    return s.to_case(Case::Kebab);
}

#[cfg(test)]
mod test {
    use swc_core::common::{chain, Mark};
    use swc_core::ecma::transforms::base::resolver;
    use swc_core::ecma::transforms::testing::test_inline;
    use swc_core::ecma::transforms::testing::{test, Tester};
    use swc_core::ecma::{
        parser::{Syntax, TsSyntax},
        visit::{as_folder, Fold},
    };

    const SYNTAX: Syntax = Syntax::Typescript(TsSyntax {
        tsx: true,
        decorators: false,
        dts: false,
        no_early_errors: false,
        disallow_ambiguous_jsx_like: true,
    });

    fn runner(_: &mut Tester) -> impl Fold {
        chain!(
            resolver(Mark::new(), Mark::new(), false),
            as_folder(super::VueComponentCompleter{})
        )
    }

    test_inline!(SYNTAX, runner,
        /* Name */ should_complete_display_name_with_styled,
        /* Input */ r#"
            const X = styled("div")({})
        "#,
        /* Output */ r#"
            const X = styled("div", { displayName: "X" })({})
        "#
    );

    test_inline!(SYNTAX, runner,
        /* Name */ should_complete_props_with_styled,
        /* Input */ r#"
            export const X = styled<{ path: string, placement?: "start" | "end", $default?: VNodeChild }, "div">("div", () => (Wrap) => <Wrap />)({})
        "#,
        /* Output */ r#"
            export const X = styled<{ path: string, placement?: "start" | "end", $default?: VNodeChild }, "div">("div", () => (Wrap) => <Wrap />, { displayName: "X", props: ["path", "placement"] })({})
        "#
    );

    test_inline!(SYNTAX, runner,
        /* Name */ should_complete_display_name,
        /* Input */ r#"
            const X = component(() => null)
        "#,
        /* Output */ r#"
            const X = component(() => null, { displayName: "X" })
        "#
    );

    test_inline!(SYNTAX, runner,
        /* Name */ should_complete_with_props,
        /* Input */ r#"
            const X = component<{ active?: boolean }>(() => null)
        "#,
        /* Output */ r#"
            const X = component<{ active?: boolean }>(() => null, { displayName: "X", props: ["active"] })
        "#
    );

    test_inline!(SYNTAX, runner,
        /* Name */ should_complete_with_emits,
        /* Input */ r#"
            const X = component<{ onSelected?: () => void, onDidUpdate?: () => void }>(() => null)
        "#,
        /* Output */ r#"
            const X = component<{ onSelected?: () => void, onDidUpdate?: () => void }>(() => null, { displayName: "X", emits: ["selected", "did-update"] })
        "#
    );
}
