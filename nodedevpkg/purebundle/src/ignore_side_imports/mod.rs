use swc_core::ecma::ast::{ModuleDecl, ModuleItem, Pass};
use swc_core::ecma::visit::{noop_visit_mut_type, visit_mut_pass, VisitMut, VisitMutWith};

pub fn ignore_side_imports() -> impl VisitMut + Pass {
    visit_mut_pass(IgnoreSideImports {})
}

struct IgnoreSideImports {}

impl VisitMut for IgnoreSideImports {
    noop_visit_mut_type!();

    fn visit_mut_module_items(&mut self, expr: &mut Vec<ModuleItem>) {
        expr.visit_mut_children_with(self);

        expr.retain(|node| {
            if let ModuleItem::ModuleDecl(ModuleDecl::Import(import_decl)) = node {
                if import_decl.specifiers.is_empty() {
                    return false;
                }
            }
            return true;
        });
    }
}

#[cfg(test)]
mod test {
    use swc_core::common::Mark;
    use swc_core::ecma::ast::Pass;
    use swc_core::ecma::transforms::base::resolver;
    use swc_core::ecma::transforms::testing::{test, Tester};
    use swc_core::ecma::{
        parser::{Syntax, TsSyntax},
        visit::visit_mut_pass,
    };

    const SYNTAX: Syntax = Syntax::Typescript(TsSyntax {
        tsx: true,
        decorators: false,
        dts: false,
        no_early_errors: false,
        disallow_ambiguous_jsx_like: true,
    });

    fn runner(_: &mut Tester) -> impl Pass {
        (
            resolver(Mark::new(), Mark::new(), false),
            visit_mut_pass(super::IgnoreSideImports {}),
        )
    }

    swc_core::ecma::transforms::testing::test_inline!(
        SYNTAX,
        runner,
        /* Name */ side_import_should_drop,
        /* Input */ r#"
            import { x } from "x"
            import "x"
        "#,
        /* Output */ r#"
             import { x } from "x"
        "#
    );
}
