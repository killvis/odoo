# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import api, fields, models, _


class MrpProduction(models.Model):
    _inherit = 'mrp.production'

    mto_purchase_order_count = fields.Integer("Count PO", compute='_compute_mto_purchase_order_count')

    @api.depends('move_raw_ids.created_purchase_line_id.order_id')
    def _compute_mto_purchase_order_count(self):
        for purchase in self:
            purchase.mto_purchase_order_count = len(purchase.move_raw_ids.created_purchase_line_id.order_id)

    def _get_document_iterate_key(self, move_raw_id):
        return super(MrpProduction, self)._get_document_iterate_key(move_raw_id) or 'created_purchase_line_id'

    def action_view_mto_mto_purchase_orders(self):
        self.ensure_one()
        return {
            'name': _('Purchase Order generated from %s' % self.name),
            'domain': [('id', 'in', self.move_raw_ids.created_purchase_line_id.order_id.ids)],
            'res_model': 'purchase.order',
            'type': 'ir.actions.act_window',
            'view_mode': 'tree,form',
        }


class PurchaseOrder(models.Model):
    _inherit = 'purchase.order'

    mto_mrp_production_count = fields.Integer("Count MO Source", compute='_compute_mto_mrp_production_count')

    @api.depends('order_line.move_dest_ids.raw_material_production_id')
    def _compute_mto_mrp_production_count(self):
        for purchase in self:
            purchase.mto_mrp_production_count = len(purchase.order_line.move_dest_ids.raw_material_production_id)

    def action_view_mto_mrp_productions(self):
        self.ensure_one()
        return {
            'name': _('Manufacturing Source of %s' % self.name),
            'domain': [('id', 'in', self.order_line.move_dest_ids.raw_material_production_id.ids)],
            'res_model': 'mrp.production',
            'type': 'ir.actions.act_window',
            'view_mode': 'tree,form',
        }


class PurchaseOrderLine(models.Model):
    _inherit = 'purchase.order.line'

    def _compute_qty_received(self):
        super(PurchaseOrderLine, self)._compute_qty_received()
        for line in self:
            if line.qty_received_method == 'stock_moves' and line.move_ids:
                kit_bom = self.env['mrp.bom']._bom_find(product=line.product_id, company_id=line.company_id.id, bom_type='phantom')
                if kit_bom:
                    moves = line.move_ids.filtered(lambda m: m.state == 'done' and not m.scrapped)
                    order_qty = line.product_uom._compute_quantity(line.product_uom_qty, kit_bom.product_uom_id)
                    filters = {
                        'incoming_moves': lambda m: m.location_id.usage == 'supplier' and (not m.origin_returned_move_id or (m.origin_returned_move_id and m.to_refund)),
                        'outgoing_moves': lambda m: m.location_id.usage != 'supplier' and m.to_refund
                    }
                    line.qty_received = moves._compute_kit_quantities(line.product_id, order_qty, kit_bom, filters)

    def _get_upstream_documents_and_responsibles(self, visited):
        return [(self.order_id, self.order_id.user_id, visited)]

class StockMove(models.Model):
    _inherit = 'stock.move'

    def _prepare_phantom_move_values(self, bom_line, product_qty, quantity_done):
        vals = super(StockMove, self)._prepare_phantom_move_values(bom_line, product_qty, quantity_done)
        if self.purchase_line_id:
            vals['purchase_line_id'] = self.purchase_line_id.id
        return vals

