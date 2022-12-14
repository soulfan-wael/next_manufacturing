frappe.ui.form.on("Job Card",{
    onload:function(frm){
        if(!frm.doc.__islocal && frm.doc.docstatus == 0){
            if(frm.doc.for_quantity > frm.doc.total_completed_qty){
                frm.page.clear_primary_action();
            }
        }
       if (frm.custom_buttons) frm.clear_custom_buttons();
    },
    refresh: function(frm){
        if(!frm.doc.__islocal && frm.doc.docstatus == 0){
            if(frm.doc.for_quantity > frm.doc.total_completed_qty){
                frm.page.clear_primary_action();
            }
        }
        if (frm.custom_buttons) frm.clear_custom_buttons();

        if (frm.doc.docstatus == 0 && (frm.doc.for_quantity > frm.doc.total_completed_qty || !frm.doc.for_quantity)
			&& (frm.doc.items || !frm.doc.items.length || frm.doc.for_quantity == frm.doc.transferred_qty)) {
			frm.trigger("prepare_timer_buttons");
		}

        if (frm.doc.status != 'Completed' && frm.doc.items.length > 0){
            if(frm.doc.status != 'Open'){
                frm.add_custom_button(__('Add Additional Material'), function() {
                    frappe.prompt(
                        [
                            {
                                fieldtype: "Link",
                                label: __("Item"),
                                options: "Item",
                                fieldname: "item_code",
                                reqd:1,
                                get_query: () => {
                                    return {
                                        query: "next_manufacturing.next_manufacturing.custom_work_order.get_filtered_item",
                                        filters : {
                                            "is_stock_item": 1,
                                            "bom": frm.doc.bom_no
                                        }
                                    }
                                }
                            },
                            {
                                "fieldtype": "Column Break"
                            },
                            {
                                fieldtype: "Float",
                                label: __("Required Qty"),
                                fieldname: "required_qty",
                                reqd:1
                            },
                            {
                                "fieldtype": "Column Break"
                            },
                            {
                                fieldtype: "Link",
                                label: __("Warehouse"),
                                fieldname: "warehouse",
                                options: "Warehouse",
                                get_query: () => {
                                    return {
                                        filters : {
                                            "company": frm.doc.company
                                        }
                                    }
                                }
                            }
                        ],
                        function(data) {
                            frm.call({
                                method: "next_manufacturing.next_manufacturing.custom_job_card.add_additional_fabric_in_job_card",
                                args: {
                                    doc_name: frm.doc.name,
                                    item_code:data.item_code,
                                    required_qty:data.required_qty,
                                    warehouse:data.warehouse
                                },
                                callback: function(r){
                                    frm.reload_doc()
                                }
                            });
                        },
                        __('Additional Material'),
                        __("Add Additional Material")
                    );
                });
                if (frm.doc.for_quantity != frm.doc.transferred_qty) {
                    frm.add_custom_button(__("Material Request"), function() {
                        frm.trigger("make_material_request");
                    },__('Create'));
                }
                frm.add_custom_button(__('Consume Material'),function() {
                frappe.call({
                    method: "next_manufacturing.next_manufacturing.custom_job_card.make_material_consumption",
                        args: {
                          doc_name: frm.doc.name
                        },
                        callback: function(r){
                            if (r.message) {
                                var doc = frappe.model.sync(r.message)[0];
                                frappe.set_route("Form", doc.doctype, doc.name);
                            }
                        }
                    });
                },__('Create'));
                frm.page.set_inner_btn_group_as_primary(__('Create'));
            }
        }
    },
    prepare_timer_buttons: function(frm) {
        console.log("-- custom -- prepare_timer_buttons ---")
		frm.trigger("make_dashboard");
		if (!frm.doc.job_started) {
			frm.add_custom_button(__("Start"), () => {
				if (!frm.doc.employee) {
					frappe.prompt({fieldtype: 'Link', label: __('Employee'), options: "Employee",
						fieldname: 'employee'}, d => {
						if (d.employee) {
							frm.set_value("employee", d.employee);
							frm.set_value("status", "Work In Progress");
							frm.set_value("in_process", 1);
							frm.save();
						} else {
							frm.events.start_job(frm);
						}
					}, __("Enter Value"), __("Start"));
				} else {
					frm.events.start_job(frm);
				}
			}).addClass("btn-primary");
		} else if (frm.doc.status == "On Hold") {
			frm.add_custom_button(__("Resume"), () => {
				frappe.flags.resume_job = 1;
				frm.events.start_job(frm);
			}).addClass("btn-primary");
		} else {
			frm.add_custom_button(__("Pause"), () => {
				frappe.flags.pause_job = 1;
				frm.set_value("status", "On Hold");
				frm.events.complete_job(frm);
			});

			frm.add_custom_button(__("Complete"), () => {
				let completed_time = frappe.datetime.now_datetime();
				frm.trigger("hide_timer");
				if (frm.doc.for_quantity) {
							frm.events.complete_job(frm, completed_time, frm.doc.for_quantity);
				} else {
					frm.events.complete_job(frm, completed_time, 0);
				}
			}).addClass("btn-primary");
		}
	},
    status: function(frm){
        console.log("running........")
        frm.call({
            method: "next_manufacturing.next_manufacturing.custom_job_card.change_status_to_wo",
            args: {
                wo : frm.doc.work_order,
                status: frm.doc.status
            },
            callback: function(r){
                frm.reload_doc()
            }
        });
    }
});