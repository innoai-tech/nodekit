use itertools::Itertools;
use lazy_static::lazy_static;
use regex::Regex;
use serde::Deserialize;
use std::collections::HashMap;
use swc_core::ast::{ImportNamedSpecifier, ImportSpecifier, ModuleExportName, Str};
use swc_core::common::util::take::Take;
use swc_core::{
    ast::{
        CallExpr, Callee, Expr, Ident, ImportDecl, JSXElementName, JSXOpeningElement, Module,
        ModuleDecl, ModuleItem, Pat, Program, VarDeclarator,
    },
    common::DUMMY_SP,
    plugin::{plugin_transform, proxies::TransformPluginProgramMetadata},
    testing_transform::test,
    utils::ExprFactory,
    visit::{as_folder, noop_visit_mut_type, FoldWith, VisitMut, VisitMutWith},
};
use swc_ecma_parser::{EsConfig, Syntax};

#[plugin_transform]
pub fn access_control_autocomplete(
    program: Program,
    data: TransformPluginProgramMetadata,
) -> Program {
    let config = serde_json::from_str::<AccessControlAutocompleteOptions>(
        &data
            .get_transform_plugin_config()
            .expect("failed to get plugin config for access control autocomplete"),
    )
    .expect("invalid access control autocomplete");

    program.fold_with(&mut as_folder(AccessControlAutocomplete {
        options: config,
        fn_some_used: None,
        fn_every_used: None,
    }))
}

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AccessControlAutocompleteOptions {
    lib: Option<String>,
    fn_some: Option<String>,
    fn_every: Option<String>,
}

impl AccessControlAutocompleteOptions {
    fn import_decl(&self) -> Box<ImportDecl> {
        let v = self
            .lib
            .as_ref()
            .unwrap_or(&"@innoai-tech/access".to_string())
            .clone();

        Box::new(ImportDecl {
            src: Str::from(v),
            span: DUMMY_SP,
            specifiers: vec![],
            type_only: false,
            asserts: None,
        })
    }

    fn ident_fn_some(&self) -> Ident {
        let v = self
            .fn_some
            .as_ref()
            .unwrap_or(&"mustOneOfPermissions".to_string())
            .clone();
        Ident::new(v.into(), DUMMY_SP)
    }

    fn ident_fn_every(&self) -> Ident {
        let v = self
            .fn_every
            .as_ref()
            .unwrap_or(&"mustAllOfPermissions".to_string())
            .clone();
        Ident::new(v.into(), DUMMY_SP)
    }
}

pub struct AccessControlAutocomplete {
    options: AccessControlAutocompleteOptions,
    fn_some_used: Option<bool>,
    fn_every_used: Option<bool>,
}

impl VisitMut for AccessControlAutocomplete {
    fn visit_mut_module(&mut self, module: &mut Module) {
        // https://github.com/swc-project/swc/discussions/5426#discussioncomment-3380552
        // need to add VisitMutWith
        module.visit_mut_children_with(self);

        let fn_some_used = self.fn_some_used.unwrap_or(false);
        let fn_every_used = self.fn_every_used.unwrap_or(false);

        if fn_some_used || fn_every_used {
            let mut i = self.options.import_decl();
            let lib = i.as_mut();

            if fn_some_used {
                lib.specifiers.insert(
                    lib.specifiers.len(),
                    ImportSpecifier::Named(ImportNamedSpecifier {
                        span: DUMMY_SP,
                        local: Ident::new("__mustOneOf".into(), DUMMY_SP),
                        imported: Some(ModuleExportName::Ident(self.options.ident_fn_some())),
                        is_type_only: false,
                    }),
                )
            }

            if fn_every_used {
                lib.specifiers.insert(
                    lib.specifiers.len(),
                    ImportSpecifier::Named(ImportNamedSpecifier {
                        span: DUMMY_SP,
                        local: Ident::new("__mustAllOf".into(), DUMMY_SP),
                        imported: Some(ModuleExportName::Ident(self.options.ident_fn_every())),
                        is_type_only: false,
                    }),
                )
            }

            module
                .body
                .insert(0, ModuleItem::ModuleDecl(ModuleDecl::Import(lib.take())))
        }
    }

    fn visit_mut_var_declarator(&mut self, var_decl: &mut VarDeclarator) {
        if let Some(init) = var_decl.init.as_mut() {
            let e = init.as_mut();

            if let Expr::Arrow(arrow_expr) = e {
                if let Pat::Ident(name) = &var_decl.name {
                    if is_access_control_component_or_hook(&name.id) {
                        let scanner = &mut AccessControlIdentScanner {
                            names: HashMap::new(),
                        };

                        arrow_expr.visit_mut_children_with(scanner);

                        if scanner.names.len() > 0 {
                            let fn_name = if is_access_control_some_component_or_hook(&name.id) {
                                self.fn_some_used = Option::from(true);
                                "__mustOneOf"
                            } else {
                                self.fn_every_used = Option::from(true);
                                "__mustAllOf"
                            };

                            let call = &mut CallExpr {
                                span: DUMMY_SP,
                                args: Vec::new(),
                                callee: Ident::new(fn_name.into(), DUMMY_SP).as_callee(),
                                type_args: None,
                            };

                            for n in scanner.names.keys().sorted() {
                                call.args.insert(
                                    call.args.len(),
                                    Ident::new(n.to_string().into(), DUMMY_SP).as_arg(),
                                )
                            }

                            *e = Expr::Call(call.take())
                                .as_call(DUMMY_SP, vec![arrow_expr.take().as_arg()]);
                        }
                    }
                }
            }
        }
    }
}

struct AccessControlIdentScanner {
    names: HashMap<String, bool>,
}

impl VisitMut for AccessControlIdentScanner {
    noop_visit_mut_type!();

    fn visit_mut_jsx_opening_element(&mut self, jsx: &mut JSXOpeningElement) {
        if let JSXElementName::Ident(name) = &jsx.name {
            if is_access_control_component_or_hook(name) {
                self.names.insert(String::from(name.as_ref()), true);
            }
        }
    }

    fn visit_mut_call_expr(&mut self, call_expr: &mut CallExpr) {
        if let Callee::Expr(callee) = &call_expr.callee {
            if let Expr::Ident(callee) = &**callee {
                if is_use_request_hook(callee) {
                    for x in call_expr.args.as_mut_slice() {
                        if let Expr::Ident(arg) = x.expr.as_mut() {
                            self.names.insert(String::from(arg.as_ref()), true);
                        }
                    }
                }

                if is_access_control_component_or_hook(callee) {
                    self.names.insert(String::from(callee.as_ref()), true);
                }
            }
        }
    }
}

fn is_use_request_hook(id: &Ident) -> bool {
    lazy_static! {
        static ref RE: Regex = Regex::new(r"^use(\w+)?Request$").unwrap();
    }
    RE.is_match(id.as_ref())
}

fn is_access_control_component_or_hook(id: &Ident) -> bool {
    is_access_control_every_component_or_hook(id) || is_access_control_some_component_or_hook(id)
}

fn is_access_control_every_component_or_hook(id: &Ident) -> bool {
    lazy_static! {
        static ref RE: Regex = Regex::new(r"^(use)?Ac(Every)?[A-Z]").unwrap();
    }
    RE.is_match(id.as_ref())
}

fn is_access_control_some_component_or_hook(id: &Ident) -> bool {
    lazy_static! {
        static ref RE: Regex = Regex::new(r"^(use)?AcSome[A-Z]").unwrap();
    }
    RE.is_match(id.as_ref())
}

test!(
    _jsx(),
    |_| as_folder(_new_access_control_autocomplete()),
    should_wrap_component,
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

fn _new_access_control_autocomplete() -> AccessControlAutocomplete {
    AccessControlAutocomplete {
        options: AccessControlAutocompleteOptions {
            lib: None,
            fn_some: None,
            fn_every: None,
        },
        fn_some_used: None,
        fn_every_used: None,
    }
}

fn _jsx() -> Syntax {
    Syntax::Es(EsConfig {
        jsx: true,
        ..Default::default()
    })
}
