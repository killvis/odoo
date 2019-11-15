# -*- coding: utf-8 -*-
# Part of Odoo. See LICENSE file for full copyright and licensing details.

# NOTE Use black to automatically format this code.

from odoo import api, fields, models, _


class Coupon(models.Model):
    _inherit = "coupon.coupon"

    state = fields.Selection(selection_add=[("booked", "Booked")])
    pos_order_ref = fields.Char("PoS Order Reference")
    source_pos_order_id = fields.Many2one(
        "pos.order",
        string="Source PoS Order",
        help="PoS order where this coupon is generated.",
    )
    pos_order_id = fields.Many2one(
        "pos.order",
        string="PoS Order",
        help="PoS order where this coupon is consumed/booked.",
    )
