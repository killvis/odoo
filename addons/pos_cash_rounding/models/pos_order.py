# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

from odoo import models, fields
from odoo.tools import float_is_zero, float_round

class PosOrder(models.Model):
    _inherit = "pos.order"


    def _is_pos_order_paid(self):
        res = super(PosOrder, self)._is_pos_order_paid()
        if self.config_id.cash_rounding:
            total = float_round(self.amount_total, precision_rounding=self.config_id.rounding_method.rounding, rounding_method=self.config_id.rounding_method.rounding_method)
            res = float_is_zero(total - self.amount_paid, precision_rounding=self.currency_id.rounding)
        return res

    def _prepare_invoice_vals(self):
        vals = super(PosOrder, self)._prepare_invoice_vals()
        vals['invoice_cash_rounding_id'] = self.config_id.rounding_method.id if self.config_id.cash_rounding else False
        return vals
