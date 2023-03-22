use swc_core::ecma::ast::{ModuleDecl, ModuleItem};
use swc_core::ecma::visit::{as_folder, noop_visit_mut_type, Fold, VisitMut, VisitMutWith};

pub fn ignore_side_imports() -> impl Fold + VisitMut {
    as_folder(IgnoreSideImports {})
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
